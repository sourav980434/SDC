<?php

namespace App\Services;

use DOMDocument;
use DOMElement;
use DOMNode;
use Illuminate\Support\Facades\DB;

/**
 * One-time import of the legacy Word report templates (REPORT_MASTER) into the test formats
 * of TestFormatService. Reads the converted HTML of each test's default template and pulls out
 * the result table (parameters, units, reference ranges) or, for reports without one, the
 * narrative text. Anything it is not sure about is imported anyway and marked CHECK with the
 * reason, so the lab staff can correct it in the Test Master.
 */
class TemplateImportService
{
    /** Tags kept when a template's text is stored as HTML; everything else is unwrapped. */
    private const KEEP_TAGS = ['p', 'br', 'b', 'strong', 'i', 'em', 'u', 'sup', 'sub', 'table', 'tbody', 'thead', 'tr', 'td', 'th', 'ul', 'ol', 'li'];

    /**
     * Imports the given tests (all tests with a template when empty).
     * Returns [test_code => ['status', 'type', 'params', 'notes', 'file'|'error']] for the summary.
     * $dry = only extract and report, write nothing. $force = also overwrite formats edited by staff.
     */
    public static function import(array $testCodes = [], bool $dry = false, bool $force = false, ?string $user = null, ?callable $progress = null): array
    {
        if (!$dry) {
            TestFormatService::ensureSchema();
        }

        $index = ReportTemplateService::index();
        $codes = $testCodes ? array_map(fn ($c) => strtoupper(trim($c)), $testCodes) : array_keys($index);
        sort($codes);

        $tests = [];
        foreach (array_chunk($codes, 500) as $chunk) {
            foreach (DB::table('MTest')->whereIn('Code', $chunk)->get(['Code', 'Descr', 'DeptCode']) as $t) {
                $tests[trim($t->Code)] = $t;
            }
        }

        $edited = [];
        if (!$dry && !$force) {
            $edited = DB::table('tbl_web_test_formats')->where('is_edited', true)->pluck('test_code')->flip()->all();
        }

        $summary = [];
        foreach ($codes as $code) {
            $templates = $index[$code] ?? [];
            if (!$templates) {
                $summary[$code] = ['status' => 'SKIPPED', 'error' => 'No template for this test'];
            } elseif (isset($edited[$code])) {
                $summary[$code] = ['status' => 'SKIPPED', 'error' => 'Edited by staff - use --force to overwrite'];
            } else {
                $test = $tests[$code] ?? null;
                $file = $templates[0]['file'];
                $result = self::extract($file, $test->Descr ?? '');
                $result['format']['test_name'] = $test->Descr ?? null;
                $result['format']['dept_code'] = isset($test->DeptCode) ? trim($test->DeptCode) : null;
                if (count($templates) > 1) {
                    $result['format']['import_notes'] = trim(($result['format']['import_notes'] ?? '')
                        . "\nThis test had " . count($templates) . ' templates; imported ' . $file . '.');
                }

                if (!$dry) {
                    TestFormatService::save($code, $result, 'IMPORT', $user);
                }
                $summary[$code] = [
                    'status' => $result['format']['import_status'],
                    'type' => $result['format']['format_type'],
                    'params' => count(array_filter($result['parameters'], fn ($p) => $p['row_type'] === 'PARAM')),
                    'notes' => trim($result['format']['import_notes'] ?? ''),
                    'file' => $file,
                    'data' => $result,
                ];
            }
            if ($progress) {
                $progress($code, $summary[$code]);
            }
        }
        return $summary;
    }

    /** Reads one template and returns ['format' => [...], 'parameters' => [...]] ready for TestFormatService::save(). */
    public static function extract(string $file, string $testName = ''): array
    {
        $format = [
            'format_type' => 'NARRATIVE',
            'specimen' => null,
            'notes_html' => null,
            'narrative_html' => null,
            'source_file' => $file,
            'source_html' => null,
            'source_sections' => 1,
            'import_status' => TestFormatService::STATUS_OK,
            'import_notes' => null,
            'is_checked' => false,
            'is_edited' => false,
        ];

        try {
            $content = ReportTemplateService::content($file);
        } catch (\Throwable $e) {
            $format['import_status'] = TestFormatService::STATUS_FAILED;
            $format['import_notes'] = 'Template could not be opened: ' . $e->getMessage();
            return ['format' => $format, 'parameters' => []];
        }

        $format['source_html'] = $content['html'] ?? '';

        $doc = new DOMDocument();
        @$doc->loadHTML('<?xml encoding="utf-8"?><div id="tpl-root">' . ($content['html'] ?? '') . '</div>');
        $root = $doc->getElementById('tpl-root') ?? $doc->getElementsByTagName('div')->item(0);

        // Old templates often hold several reports one after another. Take the one for this test:
        // a section with several results (title matching the test first), else one with a single
        // result (same order), else the first. A stray one-row table must not win over the real report.
        $sections = array_map(fn ($blocks) => self::extractSection($blocks, $testName), self::sections($root));
        $several = array_filter($sections, fn ($s) => $s['count'] >= 2);
        $single = array_filter($sections, fn ($s) => $s['count'] === 1);
        $chosen = array_key_first(array_filter($several, fn ($s) => $s['title_match']))
            ?? array_key_first($several)
            ?? array_key_first(array_filter($single, fn ($s) => $s['title_match']))
            ?? array_key_first($single)
            ?? 0;
        $section = $sections[$chosen];

        $reasons = $section['reasons'];
        $format['source_sections'] = count($sections);
        if (count($sections) > 1) {
            array_unshift($reasons, 'The template holds ' . count($sections) . ' separate reports; report no. ' . ($chosen + 1)
                . ' was imported. The rest is in the original template.');
        }
        $format = array_merge($format, $section['format']);

        $reasons = array_values(array_unique($reasons));
        $doubts = array_filter($reasons, fn ($r) => !self::isInfo($r));
        if ($doubts) {
            $format['import_status'] = TestFormatService::STATUS_CHECK;
        }
        $format['import_notes'] = $reasons ? implode("\n", $reasons) : null;

        return ['format' => $format, 'parameters' => $section['parameters']];
    }

    /** Import notes that only tell what was done - they do not make the format need a check. */
    public static function isInfo(string $note): bool
    {
        return (bool) preg_match('/signature was removed|result values filled in|templates; imported/', $note);
    }

    /** Result table, notes or narrative text of one report inside a template. */
    private static function extractSection(array $blocks, string $testName): array
    {
        $format = ['format_type' => 'NARRATIVE', 'specimen' => null, 'notes_html' => null, 'narrative_html' => null];
        $reasons = [];
        $parameters = [];
        $noteBlocks = [];
        $bodyBlocks = [];
        $titleMatch = false;
        $inHeader = true;     // department / specimen / title lines above the report
        $inTable = false;
        $afterTable = false;
        foreach ($blocks as $block) {
            $text = self::text($block);
            if ($block->nodeName === 'table' && !$afterTable && self::isResultTable($block, $inHeader ? 1 : 2)) {
                $parsed = self::parseTable($block, $reasons);
                $parameters = array_merge($parameters, $parsed['parameters']);
                foreach ($parsed['notes'] as $note) {
                    $noteBlocks[] = $note;
                }
                $inTable = true;
                $inHeader = false;
                continue;
            }
            if ($inTable && $text !== '' && $text !== '.') {
                $afterTable = true;
            }

            if ($inHeader && $block->nodeName === 'table') {
                $inHeader = false;
            }
            if ($inHeader) {
                if (!$format['specimen'] && preg_match('/^SPECIMEN\s*[:\-]*\s*[:\-]?\s*(.+)$/iu', $text, $m)) {
                    // "SPECIMEN : - SERUM. LIVER FUNCTION TEST" - the title sometimes shares the line
                    $parts = preg_split('/\.\s+/', $m[1], 2);
                    $format['specimen'] = mb_substr(trim($parts[0], " .:-"), 0, 150);
                    $titleMatch = $titleMatch || (isset($parts[1]) && self::similar($parts[1], $testName));
                    continue;
                }
                if (self::isHeadingLine($text, $testName)) {
                    $titleMatch = $titleMatch || self::similar($text, $testName);
                    continue;
                }
                $inHeader = false;
            }
            if ($afterTable && $block->nodeName === 'table') {
                $reasons[] = 'A second table after the notes was kept in the notes - remove it if it is not needed.';
            }
            $bodyBlocks[] = $block;
        }

        [$bodyBlocks, $cutSignature] = self::dropSignature($bodyBlocks);
        if ($cutSignature) {
            $reasons[] = 'A doctor\'s name / signature was removed from the text (it now comes from the reporting doctor).';
        }

        $count = count(array_filter($parameters, fn ($p) => $p['row_type'] === 'PARAM'));
        if ($count) {
            $format['format_type'] = 'TABLE';
            $format['notes_html'] = self::toHtml(array_merge($noteBlocks, $bodyBlocks)) ?: null;
        } else {
            $parameters = [];
            $format['narrative_html'] = self::toHtml(array_merge($noteBlocks, $bodyBlocks)) ?: null;
            $length = mb_strlen(trim(html_entity_decode(strip_tags($format['narrative_html'] ?? ''), ENT_QUOTES | ENT_HTML5, 'UTF-8')));
            if ($length === 0) {
                $reasons[] = 'No result table or report text was found in the template.';
            } elseif ($length < 30) {
                $reasons[] = 'Very little report text was found in the template - please type the report format.';
            }
        }

        return ['format' => $format, 'parameters' => $parameters, 'reasons' => $reasons, 'count' => $count, 'title_match' => $titleMatch];
    }

    /**
     * Flattens the template into top-level blocks (paragraphs and tables) and splits it wherever a
     * new "DEPARTMENT OF ..." heading starts - old templates often hold several reports one after another.
     */
    private static function sections(DOMNode $root): array
    {
        $blocks = [];
        $collect = function (DOMNode $node) use (&$collect, &$blocks) {
            foreach ($node->childNodes as $child) {
                if (!$child instanceof DOMElement) {
                    continue;
                }
                $tag = strtolower($child->nodeName);
                if (in_array($tag, ['p', 'table', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol'], true)) {
                    $blocks[] = $child;
                } else {
                    $collect($child);
                }
            }
        };
        $collect($root);

        $sections = [];
        $current = [];
        $hasContent = false;
        foreach ($blocks as $block) {
            $text = self::text($block);
            if ($block->nodeName !== 'table' && preg_match('/^DEPARTMENT\s+OF\b/i', $text) && $hasContent) {
                $sections[] = $current;
                $current = [];
                $hasContent = false;
            }
            $current[] = $block;
            if ($text !== '' && $text !== '.' && !preg_match('/^DEPARTMENT\s+OF\b/i', $text)) {
                $hasContent = true;
            }
        }
        if ($current) {
            $sections[] = $current;
        }
        return $sections ?: [[]];
    }

    /** Department / sub-department / title lines above the result table - the new layout prints these itself. */
    private static function isHeadingLine(string $text, string $testName): bool
    {
        if ($text === '' || $text === '.' || preg_match('/^\.?\s*DEPARTMENT\s+OF\b/i', $text)) {
            return true;
        }
        if (preg_match('/\bRESULTS?\b.*\b(UNITS?|RANGE)\b/i', $text) && mb_strlen($text) <= 80) {
            return true;   // "Test Description Result Unit Normal Range" typed above the table
        }
        if (preg_match('/^[A-Z0-9 &\/().,\-]+$/', $text) && preg_match('/[A-Z]{3}/', $text) && mb_strlen($text) <= 80) {
            return true;   // "(BIOCHEMISTRY)", "LIPID PROFILE", "REPORT ON EXAMINATION OF URINE"
        }
        return $testName !== '' && self::similar($text, $testName);
    }

    private static function similar(string $a, string $b): bool
    {
        $norm = fn ($s) => preg_replace('/[^A-Z0-9]/', '', strtoupper($s));
        $a = $norm($a);
        $b = $norm($b);
        return $a !== '' && $b !== '' && (str_contains($a, $b) || str_contains($b, $a));
    }

    /** A table of results: has a RESULT / UNIT / RANGE header, or several "name | value | unit | range" or "name : value" rows. */
    private static function isResultTable(DOMElement $table, int $minRows = 2): bool
    {
        $rows = self::rows($table);
        $paramLike = 0;
        foreach ($rows as $cells) {
            $filled = array_values(array_filter($cells, fn ($c) => $c !== ''));
            if (self::headerMap($cells)) {
                return true;
            }
            if (count($filled) >= 5) {
                return false;   // a grid such as the Widal dilution table - kept as text
            }
            if (count($filled) >= 2 && mb_strlen($filled[0]) <= 60 && (self::looksLikeUnit($cells[2] ?? '') || ($cells[1] ?? '') === ':' || self::looksLikeRange(end($filled)))) {
                $paramLike++;
            }
        }
        return $paramLike >= $minRows;
    }

    /** Column positions from a header row such as "INVESTIGATION | RESULTS | UNIT | REFERENCE RANGE", or null. */
    private static function headerMap(array $cells): ?array
    {
        $map = [];
        foreach ($cells as $i => $cell) {
            $c = strtoupper($cell);
            if ($c === '') {
                continue;
            }
            if (preg_match('/\bRANGE|\bREF\b|\bREF\.|\bREFERENCE|\bNORMAL\b|\bINTERVAL/', $c)) {
                $map['range'] = $i;
            } elseif (preg_match('/^RESULTS?$|^VALUES?$|OBSERVED/', $c)) {
                $map['value'] = $i;
            } elseif (preg_match('/^UNITS?$/', $c)) {
                $map['unit'] = $i;
            } elseif (preg_match('/INVESTIGATION|TEST|PARAMETER|DESCRIPTION|EXAMINATION/', $c) && !isset($map['name'])) {
                $map['name'] = $i;
            }
        }
        $looksLikeHeader = !array_filter($cells, fn ($c) => mb_strlen($c) > 40 || preg_match('/\d|^:/', $c));
        return (isset($map['range']) || isset($map['unit'])) && $looksLikeHeader ? $map + ['name' => 0] : null;
    }

    private static function parseTable(DOMElement $table, array &$reasons): array
    {
        $parameters = [];
        $notes = [];
        $map = null;
        $mapWidth = 0;      // cells in the header row - its columns only line up with rows of the same width
        $last = null;       // index of the last PARAM in $parameters
        $droppedValues = false;
        $ageRanges = false;

        foreach (self::rows($table) as $cells) {
            if (!array_filter($cells, fn ($c) => $c !== '')) {
                continue;
            }
            if ($header = self::headerMap($cells)) {
                $map = $header;
                $mapWidth = count($cells);
                continue;
            }

            $first = $cells[0] ?? '';
            $rest = array_values(array_filter(array_slice($cells, 1), fn ($c) => $c !== '' && $c !== ':' && $c !== ':-'));

            // Continuation of the previous parameter: more reference-range lines, or its method
            if ($last !== null && ($first === '' || self::isMethod($first))) {
                if ($first !== '' && !$parameters[$last]['method']) {
                    $parameters[$last]['method'] = mb_substr(trim(preg_replace('/^method(ology)?\s*:\s*/i', '', $first), '() '), 0, 255);
                }
                if ($rest) {
                    $parameters[$last]['ref_text'] = trim(($parameters[$last]['ref_text'] ?? '') . "\n" . self::joinRange($rest));
                }
                continue;
            }
            if ($first === '') {
                continue;
            }

            // A line on its own: group heading, or a note inside the table
            if (!$rest) {
                if (mb_strlen($first) <= 60 && preg_match('/^[A-Z][A-Z .&\/()\-]{2,}/', $first) && !preg_match('/\d/', $first) && !preg_match('/^(NB|NOTE|REMARKS?)\b/i', $first)) {
                    $parameters[] = self::row('HEADING', rtrim($first, ' :'));
                    $last = null;
                } else {
                    $notes[] = $first;
                }
                continue;
            }

            // "Quantity : 50 ml." - a descriptive result with a usual / default answer
            if (($cells[1] ?? '') === ':' || ($cells[1] ?? '') === ':-') {
                $value = $rest[0];
                $param = self::row('PARAM', rtrim($first, ' :'));
                $choices = array_values(array_filter(array_map('trim', preg_split('/\s*\/\s*/', $value)), fn ($c) => $c !== ''));
                if (count($choices) > 1 && !preg_match('/\d\s*\/\s*\d|\/\s*(hpf|lpf|µl|ul|ml|dl)\b/i', $value)) {
                    $param['result_type'] = 'OPTIONS';
                    $param['options'] = implode("\n", $choices);
                    $param['default_value'] = mb_substr($choices[0], 0, 255);
                } else {
                    $param['result_type'] = 'TEXT';
                    $param['default_value'] = mb_substr($value, 0, 255);
                }
                $parameters[] = $param;
                $last = array_key_last($parameters);
                continue;
            }

            // "name | value | unit | range" - by the header's columns when there was one
            if ($map && count($cells) === $mapWidth) {
                $value = $cells[$map['value'] ?? -1] ?? '';
                $unit = $cells[$map['unit'] ?? -1] ?? '';
                $range = self::joinRange(array_slice($cells, $map['range'] ?? count($cells)));
            } else {
                $unitAt = null;
                foreach ($cells as $i => $c) {
                    if ($i > 0 && self::looksLikeUnit($c)) {
                        $unitAt = $i;
                        break;
                    }
                }
                $value = $unitAt !== null ? implode(' ', array_filter(array_slice($cells, 1, $unitAt - 1))) : '';
                $unit = $unitAt !== null ? $cells[$unitAt] : '';
                $range = $unitAt !== null ? self::joinRange(array_slice($cells, $unitAt + 1)) : self::joinRange($rest);
            }

            $param = self::row('PARAM', rtrim($first, ' :'));
            $param['unit'] = $unit !== '' ? mb_substr($unit, 0, 60) : null;
            $param['ref_text'] = $range !== '' ? $range : null;
            if ($value !== '') {
                if ($param['unit'] || self::looksLikeRange($range) || !preg_match('/[a-z]{2}/i', $value)) {
                    $droppedValues = true;   // a sample value left in the template - never a default
                } else {
                    $param['result_type'] = 'TEXT';
                    $param['default_value'] = mb_substr($value, 0, 255);
                }
            }
            if (preg_match('/calculated/i', $first)) {
                $param['result_type'] = 'FORMULA';
            }
            $parameters[] = $param;
            $last = array_key_last($parameters);
        }

        // Method on its own row "(Diazo Method)" has already been folded in; now the ranges
        foreach ($parameters as $i => $param) {
            if ($param['row_type'] !== 'PARAM') {
                continue;
            }
            if ($param['method'] && preg_match('/^calculated$/i', $param['method'])) {
                $parameters[$i]['result_type'] = 'FORMULA';
            }
            if ($param['result_type'] === 'NUMERIC' || $param['result_type'] === 'FORMULA') {
                [$ranges, $hasAge] = self::parseRanges($param['ref_text'] ?? '');
                $parameters[$i]['ranges'] = $ranges;
                $ageRanges = $ageRanges || $hasAge;
            }
        }

        // Group members are indented under their heading
        $indent = 0;
        foreach ($parameters as $i => $param) {
            if ($param['row_type'] === 'HEADING') {
                $indent = 1;
            } else {
                $parameters[$i]['indent'] = $indent;
            }
        }

        if ($droppedValues) {
            $reasons[] = 'The template had result values filled in (from an old patient); they were left out.';
        }
        if ($ageRanges) {
            $reasons[] = 'Some reference ranges depend on age / group; only the adult / general range was set - please add the others.';
        }

        return ['parameters' => $parameters, 'notes' => $notes];
    }

    private static function row(string $type, string $name): array
    {
        return [
            'row_type' => $type,
            'name' => mb_substr($name, 0, 255),
            'method' => null,
            'unit' => null,
            'result_type' => 'NUMERIC',
            'options' => null,
            'default_value' => null,
            'ref_text' => null,
            'decimals' => null,
            'formula' => null,
            'indent' => 0,
            'is_bold' => false,
            'is_active' => true,
            'ranges' => [],
        ];
    }

    /**
     * Numeric ranges from the printed reference text: "[ MALE : 13.0 – 18.0 ]", "Females : Upto 34U/L",
     * "< 20", "6.4 – 8.3". Lines for an age group (children, newborn, 1-17 years ...) are left as text.
     * Returns [ranges, hadAgeLines].
     */
    public static function parseRanges(string $text): array
    {
        $ranges = [];
        $hasAge = false;
        $sexSeen = [];
        // "Male - < 5.4 Female - < 4.2" on one line: one line per sex
        $text = preg_replace('/(?<=\S)\s+(?=(?:adults?\s+)?(?:fe)?males?\b)/i', "\n", $text);
        foreach (preg_split('/\n|\]|\)\s*\(|\s(?=\()/', $text) as $line) {
            $line = trim(str_replace(["\u{AD}", '[', ']', '(', ')'], '', $line));
            if ($line === '') {
                continue;
            }
            if (preg_match('/\b(child|infant|newborn|neonat|cord|premature)|(year|yrs?\b|month|days?\b)/i', $line)
                && !preg_match('/^adults?\b/i', $line)) {
                $hasAge = true;
                continue;
            }

            $sex = 'A';
            if (preg_match('/\bfemales?\b/i', $line)) {
                $sex = 'F';
            } elseif (preg_match('/\bmales?\b/i', $line)) {
                $sex = 'M';
            }
            if (isset($sexSeen[$sex])) {
                continue;   // first line per sex wins ("Desirable <200" before "Border line 200-239")
            }

            $num = '(\d[\d,]*(?:\.\d+)?)';
            $low = $high = null;
            if (preg_match("/$num\s*(?:-|–|—|to)\s*$num/u", $line, $m)) {
                [$low, $high] = [self::num($m[1]), self::num($m[2])];
            } elseif (preg_match("/(?:<|≤|less than|upto|up to|below)\s*=?\s*$num/iu", $line, $m)) {
                $high = self::num($m[1]);
            } elseif (preg_match("/(?:>|≥|more than|above)\s*=?\s*$num/iu", $line, $m)) {
                $low = self::num($m[1]);
            }
            if ($low === null && $high === null) {
                continue;
            }
            $sexSeen[$sex] = true;
            $ranges[] = ['sex' => $sex, 'age_from' => null, 'age_to' => null, 'age_unit' => 'Y', 'low' => $low, 'high' => $high, 'panic_low' => null, 'panic_high' => null];
        }
        return [$ranges, $hasAge];
    }

    private static function num(string $s): float
    {
        return (float) str_replace(',', '', $s);
    }

    private static function isMethod(string $text): bool
    {
        return (bool) preg_match('/^\(.*\)$|^calculated$|^method(ology)?\s*:/i', $text) && mb_strlen($text) <= 80;
    }

    private static function looksLikeUnit(string $text): bool
    {
        $t = trim($text);
        if ($t === '' || mb_strlen($t) > 25) {
            return false;
        }
        return (bool) preg_match('~^(%|[a-zµμ.]*\s*/\s*[a-zµμ0-9.²\s]+|mg|g|gm|fl|pg|u|iu|miu|meq|mmol|µmol|umol|ng|ìu|mm\.?\s*1st\s*hr\.?|sec|secs|seconds|mins?|ratio|index|titre)$~iu', $t)
            || (bool) preg_match('~^(mg|g|gm|u|iu|ng|pg|µg|ug|mmol|meq|mill?ions?|lacs?|lakhs?|cells|copies|mIU|µIU|uIU)\b~iu', $t);
    }

    private static function looksLikeRange(string $text): bool
    {
        return (bool) preg_match('/\d\s*(-|–|—|to)\s*\d|[<>≤≥]\s*\d|upto|up to|less than|more than/iu', $text);
    }

    private static function joinRange(array $cells): string
    {
        $cells = array_values(array_filter(array_map('trim', $cells), fn ($c) => $c !== '' && $c !== ':'));
        return trim(implode(' ', $cells));
    }

    /** Cells of each row, as trimmed text (nested tables are read as text of their cell). */
    private static function rows(DOMElement $table): array
    {
        $rows = [];
        foreach ($table->getElementsByTagName('tr') as $tr) {
            if (self::closestTable($tr) !== $table) {
                continue;
            }
            $cells = [];
            foreach ($tr->childNodes as $td) {
                if ($td instanceof DOMElement && in_array(strtolower($td->nodeName), ['td', 'th'], true)) {
                    $cells[] = self::text($td);
                }
            }
            $rows[] = $cells;
        }
        return $rows;
    }

    private static function closestTable(DOMNode $node): ?DOMNode
    {
        for ($n = $node->parentNode; $n; $n = $n->parentNode) {
            if (strtolower($n->nodeName) === 'table') {
                return $n;
            }
        }
        return null;
    }

    private static function text(DOMNode $node): string
    {
        $text = str_replace("\u{AD}", '', $node->textContent);
        return trim(preg_replace('/[\s\x{a0}]+/u', ' ', $text));
    }

    /** Cuts the text from the doctor's name ("DR. S. BHATTACHARYA", "Consultant Radiologist") to the end. */
    private static function dropSignature(array $blocks): array
    {
        foreach ($blocks as $i => $block) {
            if ($block->nodeName === 'table') {
                continue;
            }
            $text = self::text($block);
            if (preg_match('/^DR\.?\s+[A-Z]|^(CONSULTANT|PATHOLOGIST|RADIOLOGIST|SONOLOGIST)\b|\bM\.?D\.?\s*[\[(]?\s*(PATH|RADIO)/i', $text)) {
                return [array_slice($blocks, 0, $i), true];
            }
        }
        return [$blocks, false];
    }

    /**
     * Clean HTML of the given blocks: only simple formatting tags (bold, underline, lists, tables),
     * Word styles dropped, centred text kept, empty paragraphs at the ends removed.
     */
    private static function toHtml(array $blocks): string
    {
        $parts = [];
        foreach ($blocks as $block) {
            if (is_string($block)) {
                $parts[] = '<p>' . htmlspecialchars($block, ENT_QUOTES, 'UTF-8') . '</p>';
                continue;
            }
            $tag = strtolower($block->nodeName);
            if (preg_match('/^h[1-6]$/', $tag)) {
                $parts[] = '<p><b><u>' . self::inner($block) . '</u></b></p>';
                continue;
            }
            $parts[] = self::clean($block);
        }

        // Drop blank paragraphs at the start and end, and collapse runs of them
        $html = implode("\n", $parts);
        $blank = '<p[^>]*>(?:[\s\x{a0}.]|&nbsp;|<br\s*/?>|</?(?:b|u|i|strong|em)>)*</p>';
        $html = preg_replace("~(?:$blank\s*){2,}~iu", "<p>&nbsp;</p>\n", $html);
        $html = preg_replace("~^(?:\s*$blank)+|(?:$blank\s*)+$~iu", '', trim($html));
        return trim($html);
    }

    private static function clean(DOMNode $node): string
    {
        if ($node->nodeType === XML_TEXT_NODE) {
            $text = str_replace("\u{AD}", '', $node->nodeValue);
            return htmlspecialchars(preg_replace('/\s+/u', ' ', $text), ENT_QUOTES, 'UTF-8');
        }
        if (!$node instanceof DOMElement) {
            return '';
        }

        $tag = strtolower($node->nodeName);
        if ($tag === 'img' || $tag === 'style' || $tag === 'script') {
            return '';
        }
        $inner = self::inner($node);
        if (!in_array($tag, self::KEEP_TAGS, true)) {
            return $inner;
        }
        if ($tag === 'br') {
            return '<br>';
        }

        $attrs = '';
        if (in_array($tag, ['td', 'th'], true)) {
            foreach (['colspan', 'rowspan'] as $a) {
                if ($node->hasAttribute($a) && (int) $node->getAttribute($a) > 1) {
                    $attrs .= " $a=\"" . (int) $node->getAttribute($a) . '"';
                }
            }
        }
        if (in_array($tag, ['p', 'td', 'th'], true)) {
            $align = strtolower($node->getAttribute('align'));
            if (preg_match('/text-align\s*:\s*(center|right|justify)/i', $node->getAttribute('style'), $m)) {
                $align = strtolower($m[1]);
            }
            if (in_array($align, ['center', 'right'], true)) {
                $attrs .= " style=\"text-align:$align\"";
            }
        }
        if ($tag === 'table') {
            $attrs .= ' class="fmt-table"';
        }
        return "<$tag$attrs>$inner</$tag>";
    }

    private static function inner(DOMNode $node): string
    {
        $html = '';
        foreach ($node->childNodes as $child) {
            $html .= self::clean($child);
        }
        return $html;
    }
}
