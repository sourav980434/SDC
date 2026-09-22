<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Pre-converts every Word report template so the editor opens them instantly.
// Run once after copying the REPORT_MASTER folder:  php artisan report-templates:warm
Artisan::command('report-templates:warm {--batch=40}', function () {
    $service = \App\Services\ReportTemplateService::class;

    if (!$service::wordInstalled()) {
        $this->error('Microsoft Word is not installed on this PC. Install Word and run this command again.');
        return 1;
    }

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
