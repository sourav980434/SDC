<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\Process\Process;

/**
 * Legacy Word report templates (REPORT_MASTER folder).
 *
 * File names carry the test link, so no manual mapping is needed:
 *   T0000006_D0000390_1313504.dot   -> test T0000006, variant D0000390
 *   T0000006D000039211154031.dot    -> same, written without underscores
 *   U0000003_T0000010_1021114.dot   -> test T0000010, personal template of user U0000003
 *
 * Templates stay in the folder (users keep editing them in Word). They are converted to HTML
 * with MS Word on first use and cached until the file changes.
 */
class ReportTemplateService
{
    const EXTENSIONS = 'dot|doc|dotx|docx';
    const DEFAULTS_FILE = '_defaults.json';

    public static function dir(): string
    {
        $path = config('report_templates.path');
        $isAbsolute = preg_match('/^([A-Za-z]:[\\\\\/]|[\\\\\/])/', $path);
        return rtrim($isAbsolute ? $path : base_path($path), '\\/');
    }

    /**
     * Where converted HTML is stored. Default is REPORT_MASTER/_html, so the converted templates
     * travel with the folder (git / copy) and a server without Word or LibreOffice can still
     * open every template that was converted before.
     */
    public static function cacheDir(): string
    {
        $dir = config('report_templates.cache_path') ?: (self::dir() . DIRECTORY_SEPARATOR . '_html');
        if (!is_dir($dir)) {
            @mkdir($dir, 0777, true);
        }
        return $dir;
    }

    /** True when MS Word is registered on this (server) PC. Cached for 10 minutes. */
    public static function wordInstalled(): bool
    {
        return Cache::remember('report_tpl_word_installed', 600, function () {
            if (PHP_OS_FAMILY !== 'Windows') {
                return false;
            }
            $process = new Process(['reg', 'query', 'HKCR\\Word.Application\\CurVer', '/ve'], null, self::windowsEnv());
            $process->setTimeout(10);
            $process->run();
            return $process->isSuccessful();
        });
    }

    /** Path of the LibreOffice binary (works on Linux / cloud servers), or null. Cached 10 minutes. */
    public static function libreOfficePath(): ?string
    {
        return Cache::remember('report_tpl_libreoffice', 600, function () {
            $candidates = array_filter([
                config('report_templates.libreoffice'),
                '/usr/bin/soffice',
                '/usr/local/bin/soffice',
                '/opt/libreoffice/program/soffice',
                'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
                'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
            ]);
            foreach ($candidates as $path) {
                if (is_file($path)) {
                    return $path;
                }
            }
            // Otherwise whatever is on PATH
            foreach (['soffice', 'libreoffice'] as $bin) {
                try {
                    $process = new Process([$bin, '--version'], null, PHP_OS_FAMILY === 'Windows' ? self::windowsEnv() : null);
                    $process->setTimeout(20);
                    $process->run();
                    if ($process->isSuccessful()) {
                        return $bin;
                    }
                } catch (\Throwable $e) {
                    // not installed
                }
            }
            return null;
        });
    }

    /** True when the pure-PHP converter is installed (phpoffice/phpword) - needs nothing on the OS. */
    public static function phpWordAvailable(): bool
    {
        return class_exists(\PhpOffice\PhpWord\IOFactory::class);
    }

    /**
     * Converters this machine can use, best layout first:
     *   'word'        - MS Word via COM (Windows, best fidelity, handles legacy .dot)
     *   'libreoffice' - soffice --headless (Linux / cloud, handles legacy .dot)
     *   'phpword'     - pure PHP, no OS dependency; .docx / .rtf only, simpler layout
     * Reports themselves need NO converter: converted templates are cached in REPORT_MASTER/_html
     * and travel with the folder.
     */
    public static function converters(): array
    {
        $list = [];
        if (self::wordInstalled()) {
            $list[] = 'word';
        }
        if (self::libreOfficePath()) {
            $list[] = 'libreoffice';
        }
        if (self::phpWordAvailable()) {
            $list[] = 'phpword';
        }
        return $list;
    }

    /** The converter that would be used first, or null when this machine has none. */
    public static function converter(): ?string
    {
        return self::converters()[0] ?? null;
    }

    /** Parses a template file name into its test link, or null when the name has no test code. */
    public static function parseName(string $file): ?array
    {
        $ext = self::EXTENSIONS;
        if (preg_match("/^T(\\d{7})_?D(\\d{7})_?(\\d*)\\.($ext)$/i", $file, $m)) {
            return ['test_code' => 'T' . $m[1], 'variant' => 'D' . $m[2], 'variant_type' => 'DEFAULT'];
        }
        if (preg_match("/^U(\\d{7})_T(\\d{7})_(\\d*)\\.($ext)$/i", $file, $m)) {
            return ['test_code' => 'T' . $m[2], 'variant' => 'U' . $m[1], 'variant_type' => 'USER'];
        }
        return null;
    }

    /** All linked templates in the folder, keyed by test code. Re-scanned whenever the folder changes. */
    public static function index(): array
    {
        $dir = self::dir();
        if (!is_dir($dir)) {
            return [];
        }

        $defaultsFile = $dir . DIRECTORY_SEPARATOR . self::DEFAULTS_FILE;
        $key = 'report_tpl_index_' . md5(implode('|', [
            $dir,
            filemtime($dir),
            is_file($defaultsFile) ? filemtime($defaultsFile) : 0,
            Cache::get('report_tpl_index_ver', 0),
        ]));

        return Cache::remember($key, 3600, function () use ($dir) {
            $defaults = self::defaults();
            $index = [];
            foreach (scandir($dir) as $file) {
                $info = self::parseName($file);
                if (!$info || !is_file("$dir/$file")) {
                    continue;
                }
                $index[$info['test_code']][] = $info + [
                    'file' => $file,
                    'modified' => date('Y-m-d H:i', filemtime("$dir/$file")),
                    'size_kb' => (int) ceil(filesize("$dir/$file") / 1024),
                ];
            }

            // Default first: the one chosen in Report Template master, else the newest regular template.
            // Personal (U...) templates come after the regular ones.
            foreach ($index as $testCode => $list) {
                $chosen = $defaults[$testCode] ?? null;
                if ($chosen && !in_array($chosen, array_column($list, 'file'), true)) {
                    $chosen = null;
                }
                usort($list, function ($a, $b) use ($chosen) {
                    if ($chosen && ($a['file'] === $chosen || $b['file'] === $chosen)) {
                        return $a['file'] === $chosen ? -1 : 1;
                    }
                    if ($a['variant_type'] !== $b['variant_type']) {
                        return $a['variant_type'] === 'DEFAULT' ? -1 : 1;
                    }
                    return strcmp($b['modified'], $a['modified']);
                });
                foreach ($list as $i => $tpl) {
                    $list[$i]['is_default'] = $i === 0;
                }
                $index[$testCode] = $list;
            }
            return $index;
        });
    }

    /** Test code => file chosen as default in the Report Template master (REPORT_MASTER/_defaults.json). */
    public static function defaults(): array
    {
        $path = self::dir() . DIRECTORY_SEPARATOR . self::DEFAULTS_FILE;
        $data = is_file($path) ? json_decode(file_get_contents($path), true) : [];
        return is_array($data) ? $data : [];
    }

    public static function setDefault(string $testCode, ?string $file): void
    {
        $defaults = self::defaults();
        if ($file) {
            $defaults[$testCode] = $file;
        } else {
            unset($defaults[$testCode]);
        }
        ksort($defaults);
        file_put_contents(self::dir() . DIRECTORY_SEPARATOR . self::DEFAULTS_FILE, json_encode($defaults, JSON_PRETTY_PRINT));
        self::bumpIndex();
    }

    /**
     * Saves an uploaded Word file with the linking name (T<test>_D<variant>_<stamp>.ext or
     * U<user>_T<test>_<stamp>.ext) and returns the new file name.
     */
    public static function store(string $sourcePath, string $extension, string $testCode, string $variant): string
    {
        $stamp = date('dHis');
        $base = str_starts_with($variant, 'U') ? "{$variant}_{$testCode}_{$stamp}" : "{$testCode}_{$variant}_{$stamp}";
        $file = "$base." . strtolower($extension);
        for ($n = 2; is_file(self::dir() . DIRECTORY_SEPARATOR . $file); $n++) {
            $file = "{$base}{$n}." . strtolower($extension);
        }

        if (!copy($sourcePath, self::dir() . DIRECTORY_SEPARATOR . $file)) {
            throw new \RuntimeException('Could not save the template file in the REPORT_MASTER folder.');
        }
        self::bumpIndex();
        return $file;
    }

    /**
     * Overwrites a template with an edited Word file, keeping its name (so doctor, default and
     * links stay the same). The previous file is copied to REPORT_MASTER/_versions first.
     * If the new file has another extension (.dot -> .docx) only the extension changes.
     * Returns the (possibly renamed) file name. The HTML cache refreshes by itself (mtime/size key).
     */
    public static function replace(string $file, string $sourcePath, string $extension): string
    {
        $dir = self::dir();
        $versions = $dir . DIRECTORY_SEPARATOR . '_versions';
        if (!is_dir($versions)) {
            @mkdir($versions, 0777, true);
        }
        if (!copy($dir . DIRECTORY_SEPARATOR . $file, $versions . DIRECTORY_SEPARATOR . date('Ymd_His') . '_' . $file)) {
            throw new \RuntimeException('Could not back up the current template file.');
        }

        $newFile = pathinfo($file, PATHINFO_FILENAME) . '.' . strtolower($extension);
        if (strcasecmp($newFile, $file) !== 0 && is_file($dir . DIRECTORY_SEPARATOR . $newFile)) {
            throw new \RuntimeException("A template named $newFile already exists.");
        }

        // Without a chosen default the newest file is the default, and the replaced file becomes the
        // newest - pin the current default so replacing a secondary template does not take its place
        $info = self::parseName($file);
        if ($info && empty(self::defaults()[$info['test_code']])) {
            $current = self::forTest($info['test_code'])[0]['file'] ?? null;
            if ($current) {
                self::setDefault($info['test_code'], $current);
            }
        }

        if (!copy($sourcePath, $dir . DIRECTORY_SEPARATOR . $newFile)) {
            throw new \RuntimeException('Could not overwrite the template. It may be open in Word - close it and try again.');
        }

        if (strcasecmp($newFile, $file) !== 0) {
            @unlink($dir . DIRECTORY_SEPARATOR . $file);
            if ($info && (self::defaults()[$info['test_code']] ?? null) === $file) {
                self::setDefault($info['test_code'], $newFile);
            }
        }

        self::bumpIndex();
        return $newFile;
    }

    /** Moves a template to REPORT_MASTER/_deleted (kept for recovery, no longer linked). */
    public static function remove(string $file): void
    {
        $trash = self::dir() . DIRECTORY_SEPARATOR . '_deleted';
        if (!is_dir($trash)) {
            @mkdir($trash, 0777, true);
        }
        if (!rename(self::dir() . DIRECTORY_SEPARATOR . $file, $trash . DIRECTORY_SEPARATOR . date('Ymd_His') . '_' . $file)) {
            throw new \RuntimeException('Could not move the template file. It may be open in Word.');
        }

        $info = self::parseName($file);
        if ($info && (self::defaults()[$info['test_code']] ?? null) === $file) {
            self::setDefault($info['test_code'], null);
        }
        self::bumpIndex();
    }

    /**
     * Variant codes are the legacy software's reporting doctor (MDoctor, D.......) or the user who
     * saved a personal template (SUser, U.......). Returns code => display name, cached 10 minutes.
     */
    public static function variantNames(): array
    {
        return Cache::remember('report_tpl_variant_names', 600, function () {
            $codes = [];
            foreach (self::index() as $list) {
                foreach ($list as $tpl) {
                    $codes[$tpl['variant']] = true;
                }
            }
            $codes = array_keys($codes);
            $names = [];
            try {
                $doctors = array_values(array_filter($codes, fn ($c) => $c[0] === 'D'));
                foreach (array_chunk($doctors, 500) as $chunk) {
                    foreach (DB::table('MDoctor')->whereIn('Code', $chunk)->get(['Code', 'Prefix', 'DoctName']) as $d) {
                        $names[trim($d->Code)] = trim(trim($d->Prefix ?? '') . ' ' . trim($d->DoctName ?? ''));
                    }
                }
                $users = array_values(array_filter($codes, fn ($c) => $c[0] === 'U'));
                if ($users) {
                    foreach (DB::table('SUser')->whereIn('Code', $users)->get(['Code', 'UserName', 'EmpName']) as $u) {
                        $names[trim($u->Code)] = trim($u->EmpName ?? '') ?: trim($u->UserName ?? '');
                    }
                }
            } catch (\Throwable $e) {
                // Names are cosmetic - fall back to the codes when the database is unreachable
            }
            return $names;
        });
    }

    /** Adds 'variant_name' (doctor / user name) to a template list for display. */
    public static function withNames(array $list): array
    {
        $names = self::variantNames();
        foreach ($list as $i => $tpl) {
            $list[$i]['variant_name'] = $names[$tpl['variant']] ?? $tpl['variant'];
        }
        return $list;
    }

    /**
     * Reporting doctors for the upload form: doctors whose templates already exist (most used first),
     * followed by the other in-house (SDC) doctors.
     */
    public static function reportingDoctors(): array
    {
        $usage = [];
        foreach (self::index() as $list) {
            foreach ($list as $tpl) {
                if ($tpl['variant_type'] === 'DEFAULT') {
                    $usage[$tpl['variant']] = ($usage[$tpl['variant']] ?? 0) + 1;
                }
            }
        }

        $rows = DB::table('MDoctor')
            ->where(function ($q) use ($usage) {
                $q->whereIn('Code', array_keys($usage) ?: ['-'])
                  ->orWhere('RAddress1', 'like', 'SDC%');
            })
            ->get(['Code', 'Prefix', 'DoctName']);

        $doctors = [];
        foreach ($rows as $d) {
            $code = trim($d->Code);
            $doctors[] = [
                'code' => $code,
                'name' => trim(trim($d->Prefix ?? '') . ' ' . trim($d->DoctName ?? '')),
                'template_count' => $usage[$code] ?? 0,
            ];
        }
        usort($doctors, fn ($a, $b) => [$b['template_count'], $a['name']] <=> [$a['template_count'], $b['name']]);
        return $doctors;
    }

    /**
     * Conversion coverage of the templates folder: how many linked templates already have their
     * converted HTML in REPORT_MASTER/_html. A server with no converter can open exactly those.
     */
    public static function coverage(): array
    {
        $total = 0;
        $converted = 0;
        $missing = [];
        foreach (self::index() as $list) {
            foreach ($list as $tpl) {
                $total++;
                if (self::isCached($tpl['file'])) {
                    $converted++;
                } elseif (count($missing) < 20) {
                    $missing[] = $tpl['file'];
                }
            }
        }
        return ['total' => $total, 'converted' => $converted, 'pending' => $total - $converted, 'pending_sample' => $missing];
    }

    public static function path(string $file): string
    {
        return self::dir() . DIRECTORY_SEPARATOR . $file;
    }

    private static function bumpIndex(): void
    {
        Cache::forever('report_tpl_index_ver', Cache::get('report_tpl_index_ver', 0) + 1);
        Cache::forget('report_tpl_variant_names');
    }

    public static function forTest(string $testCode): array
    {
        return self::index()[strtoupper(trim($testCode))] ?? [];
    }

    /** Looks a file up in the index so only real template files can ever be opened. */
    public static function find(string $file): ?array
    {
        $info = self::parseName(basename($file));
        if (!$info) {
            return null;
        }
        foreach (self::forTest($info['test_code']) as $tpl) {
            if (strcasecmp($tpl['file'], $file) === 0) {
                return $tpl;
            }
        }
        return null;
    }

    public static function isCached(string $file): bool
    {
        return is_file(self::cacheFile($file));
    }

    /**
     * Returns ['scope', 'css', 'html', 'page'] for a template, converting it with Word if needed.
     * Throws \RuntimeException with code 'WORD_NOT_INSTALLED' / 'CONVERSION_FAILED'.
     */
    public static function content(string $file): array
    {
        $cacheFile = self::cacheFile($file);
        if (is_file($cacheFile)) {
            $content = json_decode(file_get_contents($cacheFile), true);
            // Templates converted before the layout fix still carry Word's pinned shapes
            $content['html'] = self::normaliseRules(self::sanitizeLayout($content['html'] ?? ''));
            return $content;
        }

        $failed = self::convert([$file]);
        if (isset($failed[$file])) {
            throw new \RuntimeException($failed[$file]);
        }
        return json_decode(file_get_contents($cacheFile), true);
    }

    /**
     * Converts templates to HTML and caches them in REPORT_MASTER/_html, using MS Word when this
     * machine has it, otherwise LibreOffice. Returns [file => error code] for the ones that failed.
     * Reports never need a converter: the cache travels with the templates folder.
     */
    public static function convert(array $files): array
    {
        $converters = self::converters();
        if (!$converters) {
            Cache::forget('report_tpl_word_installed');   // re-check next time, one may get installed
            Cache::forget('report_tpl_libreoffice');
            return array_fill_keys($files, 'NO_CONVERTER');
        }

        // Try the best converter first and retry whatever it could not handle with the next one
        $pending = array_values($files);
        $failed = [];
        foreach ($converters as $converter) {
            if (!$pending) {
                break;
            }
            $failed = self::convertWith($converter, $pending);
            $pending = array_keys($failed);
        }

        if ($failed) {
            Log::warning('Report template conversion failed', [
                'converters' => $converters,
                'files' => array_keys($failed),
            ]);
        }
        return $failed;
    }

    /** Runs one converter over the given files and caches what it produced. */
    private static function convertWith(string $converter, array $files): array
    {
        $work = self::cacheDir() . DIRECTORY_SEPARATOR . 'work_' . uniqid();
        @mkdir($work, 0777, true);

        $failed = [];
        try {
            $htmPaths = match ($converter) {
                'word' => self::runWordConverter($files, $work),
                'libreoffice' => self::runLibreOfficeConverter($files, $work),
                'phpword' => self::runPhpWordConverter($files, $work),
                default => null,
            };

            if ($htmPaths === null) {
                Cache::forget('report_tpl_word_installed');
                Cache::forget('report_tpl_libreoffice');
                return array_fill_keys($files, 'NO_CONVERTER');
            }

            foreach ($files as $file) {
                $htm = $htmPaths[$file] ?? null;
                if (!$htm || !is_file($htm)) {
                    $failed[$file] = 'CONVERSION_FAILED';
                    continue;
                }
                $content = self::clean(file_get_contents($htm), $htm, self::scopeFor($file));
                file_put_contents(self::cacheFile($file), json_encode($content));
            }
        } catch (\Throwable $e) {
            Log::warning("Report template conversion error ($converter): " . $e->getMessage(), ['files' => $files]);
            foreach ($files as $file) {
                if (!is_file(self::cacheFile($file))) {
                    $failed[$file] = 'CONVERSION_FAILED';
                }
            }
        } finally {
            self::removeDir($work);
        }

        return $failed;
    }

    /** Turns Word's filtered HTML into an editor-ready fragment with CSS scoped to this template. */
    public static function clean(string $raw, string $htmPath, string $scope): array
    {
        if (preg_match('/charset=["\']?windows-1252/i', $raw)) {
            $raw = mb_convert_encoding($raw, 'UTF-8', 'Windows-1252');
        }

        // Page size and margins from Word's @page rule
        $page = ['size' => null, 'margin' => null];
        if (preg_match('/@page\s+WordSection1\s*\{([^}]*)\}/i', $raw, $m)) {
            if (preg_match('/size:\s*([^;]+);/i', $m[1], $s)) $page['size'] = trim($s[1]);
            if (preg_match('/margin:\s*([^;]+);/i', $m[1], $s)) $page['margin'] = trim($s[1]);
        }

        // Styles: drop @font-face / @page / @list blocks, prefix every selector with the scope class
        $css = '';
        if (preg_match_all('/<style[^>]*>(.*?)<\/style>/is', $raw, $styles)) {
            $css = implode("\n", $styles[1]);
            $css = preg_replace('/<!--|-->|\/\*.*?\*\//s', '', $css);
            $css = preg_replace('/@[^{]*\{[^}]*\}/', '', $css);
            // "page:WordSection1" makes browsers print the template on its own page - drop it
            $css = preg_replace('/(^|[;{\s])page\s*:\s*[^;}]+;?/i', '$1', $css);
            $css = preg_replace_callback('/([^{}]+)\{([^}]*)\}/', function ($m) use ($scope) {
                $selectors = array_filter(array_map('trim', explode(',', $m[1])));
                $selectors = array_map(fn ($sel) => ".$scope " . $sel, $selectors);
                return implode(', ', $selectors) . ' {' . preg_replace('/\s+/', ' ', trim($m[2])) . "}\n";
            }, $css);
        }

        $html = preg_match('/<body[^>]*>(.*)<\/body>/is', $raw, $b) ? $b[1] : $raw;
        $html = self::normaliseRules(self::sanitizeLayout($html));

        // Pictures (logos, signatures) are saved beside the .htm - embed them
        $baseDir = dirname($htmPath);
        $html = preg_replace_callback('/src="([^"]+)"/i', function ($m) use ($baseDir) {
            $path = $baseDir . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, urldecode($m[1]));
            if (!is_file($path)) {
                return $m[0];
            }
            $mime = mime_content_type($path) ?: 'image/png';
            return 'src="data:' . $mime . ';base64,' . base64_encode(file_get_contents($path)) . '"';
        }, $html);

        // Defensive: templates are trusted, but never pass scripts or inline handlers to the browser
        $html = preg_replace('/<script\b.*?<\/script>/is', '', $html);
        $html = preg_replace('/\son\w+\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)/i', '', $html);

        return ['scope' => $scope, 'css' => trim($css), 'html' => trim($html), 'page' => $page];
    }

    /**
     * MS Word (Windows only, best layout fidelity). Returns [template file => produced .htm path],
     * or null when Word turned out not to be usable after all.
     */
    private static function runWordConverter(array $files, string $work): ?array
    {
        $dir = self::dir();
        $lines = [];
        $htmPaths = [];
        foreach (array_values($files) as $i => $file) {
            $htmPaths[$file] = $work . DIRECTORY_SEPARATOR . "t$i.htm";
            $lines[] = str_replace('/', '\\', "$dir/$file") . '|' . $htmPaths[$file];
        }
        $listFile = $work . DIRECTORY_SEPARATOR . 'list.txt';
        file_put_contents($listFile, implode("\r\n", $lines));

        $process = new Process([
            'powershell', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
            '-File', resource_path('scripts/doc2html.ps1'), '-ListFile', $listFile,
        ], null, self::windowsEnv());
        $process->setTimeout(60 + 15 * count($files));
        $process->run();

        if (str_contains($process->getOutput(), 'NOWORD|')) {
            return null;
        }
        return $htmPaths;
    }

    /**
     * Pure-PHP converter (phpoffice/phpword) - needs nothing installed on the machine, so it also
     * works on a locked-down cloud server. It reads .docx / .rtf well; the legacy binary .doc/.dot
     * reader is limited, so those files usually fall back to Word or LibreOffice.
     */
    private static function runPhpWordConverter(array $files, string $work): ?array
    {
        if (!self::phpWordAvailable()) {
            return null;
        }

        $readers = ['docx' => 'Word2007', 'dotx' => 'Word2007', 'rtf' => 'RTF', 'doc' => 'MsDoc', 'dot' => 'MsDoc'];
        $htmPaths = [];
        // PHPWord's legacy .doc reader is noisy (warnings / deprecations); keep them out of the log
        $previousLevel = error_reporting(0);
        foreach ($files as $file) {
            $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
            if (!isset($readers[$ext])) {
                continue;
            }
            $out = $work . DIRECTORY_SEPARATOR . md5($file) . '.html';
            try {
                $doc = \PhpOffice\PhpWord\IOFactory::load(self::path($file), $readers[$ext]);
                \PhpOffice\PhpWord\IOFactory::createWriter($doc, 'HTML')->save($out);
                if (is_file($out) && filesize($out) > 0) {
                    $htmPaths[$file] = $out;
                }
            } catch (\Throwable $e) {
                Log::info("PHPWord could not read $file: " . $e->getMessage());
            }
        }
        error_reporting($previousLevel);
        return $htmPaths;
    }

    /**
     * LibreOffice headless - the converter for Linux / cloud servers. One call converts every file;
     * output lands in $work as <original name>.html.
     */
    private static function runLibreOfficeConverter(array $files, string $work): ?array
    {
        $soffice = self::libreOfficePath();
        if (!$soffice) {
            return null;
        }

        $dir = self::dir();
        $command = [
            $soffice,
            '-env:UserInstallation=file:///' . str_replace('\\', '/', $work) . '/lo_profile',
            '--headless', '--norestore', '--convert-to', 'html:HTML (StarWriter)',
            '--outdir', $work,
        ];
        foreach ($files as $file) {
            $command[] = $dir . DIRECTORY_SEPARATOR . $file;
        }

        $process = new Process($command, null, PHP_OS_FAMILY === 'Windows' ? self::windowsEnv() : null);
        $process->setTimeout(90 + 30 * count($files));
        $process->run();

        $htmPaths = [];
        foreach ($files as $file) {
            $htmPaths[$file] = $work . DIRECTORY_SEPARATOR . pathinfo($file, PATHINFO_FILENAME) . '.html';
        }
        return $htmPaths;
    }

    /**
     * `php artisan serve` starts the web server with a stripped environment (no SystemRoot, TEMP...).
     * PowerShell / Word COM cannot start without them ("Loading managed Windows PowerShell failed
     * with error 8009001d"), so rebuild the essential Windows variables for child processes.
     */
    private static function windowsEnv(): array
    {
        $systemRoot = getenv('SystemRoot') ?: (getenv('windir') ?: 'C:\\Windows');
        $systemDrive = getenv('SystemDrive') ?: substr($systemRoot, 0, 2);
        $profile = getenv('USERPROFILE') ?: ($systemDrive . '\\Users\\' . (getenv('USERNAME') ?: get_current_user()));
        $temp = getenv('TEMP') ?: sys_get_temp_dir();
        $path = getenv('PATH') ?: (getenv('Path') ?: '');

        return [
            'SystemRoot' => $systemRoot,
            'windir' => $systemRoot,
            'SystemDrive' => $systemDrive,
            'ComSpec' => getenv('ComSpec') ?: $systemRoot . '\\System32\\cmd.exe',
            'PATHEXT' => getenv('PATHEXT') ?: '.COM;.EXE;.BAT;.CMD;.VBS;.JS;.WSF;.WSH;.MSC',
            'PATH' => $systemRoot . '\\System32;' . $systemRoot . ';' . $systemRoot . '\\System32\\WindowsPowerShell\\v1.0' . ($path ? ';' . $path : ''),
            'TEMP' => $temp,
            'TMP' => getenv('TMP') ?: $temp,
            'USERPROFILE' => $profile,
            'APPDATA' => getenv('APPDATA') ?: $profile . '\\AppData\\Roaming',
            'LOCALAPPDATA' => getenv('LOCALAPPDATA') ?: $profile . '\\AppData\\Local',
            'ProgramData' => getenv('ProgramData') ?: $systemDrive . '\\ProgramData',
            'ProgramFiles' => getenv('ProgramFiles') ?: $systemDrive . '\\Program Files',
            'ProgramFiles(x86)' => getenv('ProgramFiles(x86)') ?: $systemDrive . '\\Program Files (x86)',
            'PSModulePath' => $systemRoot . '\\System32\\WindowsPowerShell\\v1.0\\Modules',
        ];
    }

    /**
     * Word draws letterhead rules and shapes as small images pinned with
     * "position:relative; z-index; left/top", which in a browser land in the middle of the text.
     * Their position is dropped so they simply flow where they belong.
     */
    public static function sanitizeLayout(string $html): string
    {
        // Word writes the style with either quote style and wraps long values over several lines
        return preg_replace_callback('/style\s*=\s*(["\'])(.*?)\1/is', function ($m) {
            $quote = $m[1];
            $style = $m[2];
            if (stripos($style, 'z-index') === false) {
                return $m[0];
            }
            $style = preg_replace('/(^|;)\s*(position|z-index|left|top|margin-left|margin-top)\s*:[^;]*/i', '$1', $style);
            $style = preg_replace('/;{2,}/', ';', $style);
            $style = trim($style, " ;\r\n\t");
            return 'style=' . $quote . $style . $quote;
        }, $html);
    }

    /**
     * Word's letterhead rules are hair-thin images (2 px tall, ~795 px wide) that would run past
     * the edge of an A4 page. They become a plain rule that always fits the page width.
     */
    public static function normaliseRules(string $html): string
    {
        return preg_replace_callback('/<img[^>]*>/i', function ($m) {
            if (!preg_match('/height\s*=\s*"?(\d+)/i', $m[0], $h) || (int) $h[1] > 4) {
                return $m[0];
            }
            return '<hr style="border:none;border-top:1px solid #000;width:100%;margin:8px 0;">';
        }, $html);
    }

    private static function scopeFor(string $file): string
    {
        return 'rt-' . substr(md5(strtolower($file)), 0, 10);
    }

    /**
     * Cache file name from the template's CONTENT hash - a git checkout or a file copy changes the
     * modified time but not the content, so the cache stays valid wherever the folder is deployed.
     */
    private static function cacheFile(string $file): string
    {
        $path = self::dir() . DIRECTORY_SEPARATOR . $file;
        $hash = is_file($path) ? md5_file($path) : '0';
        return self::cacheDir() . DIRECTORY_SEPARATOR . md5(strtolower($file) . '|' . $hash) . '.json';
    }

    private static function removeDir(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }
        foreach (array_diff(scandir($dir), ['.', '..']) as $item) {
            $path = $dir . DIRECTORY_SEPARATOR . $item;
            is_dir($path) ? self::removeDir($path) : @unlink($path);
        }
        @rmdir($dir);
    }
}
