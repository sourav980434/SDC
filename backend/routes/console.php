<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Shows whether this machine can convert templates and whether the folder is ready for a
// server without Word / LibreOffice (e.g. cloud):  php artisan report-templates:check
Artisan::command('report-templates:check', function () {
    $service = \App\Services\ReportTemplateService::class;

    $this->line('Templates folder : ' . $service::dir() . (is_dir($service::dir()) ? '' : '  [MISSING]'));
    $this->line('Converted cache  : ' . $service::cacheDir());
    $this->line('Converters       : ' . (implode(', ', $service::converters()) ?: 'none (only already-converted templates can open)'));

    $coverage = $service::coverage();
    $this->line("Templates        : {$coverage['converted']} of {$coverage['total']} converted");

    if ($coverage['pending'] > 0) {
        $this->warn("{$coverage['pending']} template(s) are not converted yet - run: php artisan report-templates:warm");
        foreach ($coverage['pending_sample'] as $file) {
            $this->line('   - ' . $file);
        }
        if ($coverage['pending'] > count($coverage['pending_sample'])) {
            $this->line('   ...');
        }
    } else {
        $this->info('All templates are converted - this folder works on a server without Word or LibreOffice.');
    }

    return 0;
})->purpose('Check report template converters and conversion coverage');

// Pre-converts every Word report template so the editor opens them instantly.
// Run once after copying the REPORT_MASTER folder:  php artisan report-templates:warm
Artisan::command('report-templates:warm {--batch=40}', function () {
    $service = \App\Services\ReportTemplateService::class;

    $converter = $service::converter();
    if (!$converter) {
        $this->error('No converter found. Install Microsoft Word (Windows) or LibreOffice, then run this command again.');
        return 1;
    }
    $this->info('Converter: ' . $converter);

    $pending = [];
    foreach ($service::index() as $templates) {
        foreach ($templates as $tpl) {
            if (!$service::isCached($tpl['file'])) {
                $pending[] = $tpl['file'];
            }
        }
    }

    if (!$pending) {
        $this->info('All templates are already converted.');
        return 0;
    }

    $this->info(count($pending) . ' template(s) to convert from ' . $service::dir());
    $bar = $this->output->createProgressBar(count($pending));
    $failed = [];
    foreach (array_chunk($pending, max(1, (int) $this->option('batch'))) as $chunk) {
        $failed += $service::convert($chunk);
        $bar->advance(count($chunk));
    }
    $bar->finish();
    $this->newLine();

    foreach ($failed as $file => $reason) {
        $this->warn("  $file: $reason");
    }
    $this->info('Converted: ' . (count($pending) - count($failed)) . ', failed: ' . count($failed));
    return 0;
})->purpose('Convert REPORT_MASTER Word templates to cached HTML');

// Imports the Word report templates (REPORT_MASTER) into the test formats in the database:
// parameters, units, reference ranges and narrative text. Formats already edited in the Test
// Master are left alone unless --force.   php artisan test-formats:import [T0000118 ...] [--dry]
Artisan::command('test-formats:import {tests?* : Test codes; all tests with a template when empty} {--dry : Only show what would be imported} {--force : Also overwrite formats edited by the lab staff}', function () {
    $tests = $this->argument('tests');
    $dry = (bool) $this->option('dry');

    $this->info(($dry ? '[DRY RUN] ' : '') . 'Importing report formats from ' . \App\Services\ReportTemplateService::dir());
    $bar = $tests && count($tests) <= 20 ? null : $this->output->createProgressBar(count($tests ?: \App\Services\ReportTemplateService::index()));

    $summary = \App\Services\TemplateImportService::import($tests, $dry, (bool) $this->option('force'), 'IMPORT', function ($code, $row) use ($bar) {
        if ($bar) {
            $bar->advance();
            return;
        }
        $this->line(sprintf('  %-9s %-8s %-9s %3s  %s', $code, $row['status'], $row['type'] ?? '', $row['params'] ?? '', $row['error'] ?? str_replace("\n", ' | ', $row['notes'] ?? '')));
    });
    if ($bar) {
        $bar->finish();
        $this->newLine();
    }

    $counts = array_count_values(array_map(fn ($r) => $r['status'] . (isset($r['type']) ? ' ' . $r['type'] : ''), $summary));
    ksort($counts);
    $this->table(['Result', 'Tests'], array_map(fn ($k, $v) => [$k, $v], array_keys($counts), $counts));
    $this->info($dry ? 'Dry run - nothing was saved.' : 'Saved. Formats marked CHECK should be looked at in the Test Master.');
    return 0;
})->purpose('Import Word report templates into database test formats');
