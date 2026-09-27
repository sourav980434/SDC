<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Saves a finished patient report as a PDF file and records it against the patient and the bill,
 * so it can be reprinted, emailed or sent on WhatsApp later.
 *
 * PDF rendering is pure PHP (mpdf/mpdf) - nothing has to be installed on the server, so this
 * works the same on the office PC and on a cloud server.
 *
 *   storage/app/reports/<yyyy-mm>/<booking no>/<test code>_<detail id>.pdf
 *   tbl_web_report_files: one row per generated file (booking + patient + test + path)
 */
class ReportPdfService
{
    /** Root folder for generated report PDFs. */
    public static function dir(): string
    {
        $dir = config('report_templates.pdf_path') ?: storage_path('app/reports');
        if (!is_dir($dir)) {
            @mkdir($dir, 0777, true);
        }
        return rtrim($dir, '\\/');
    }

    /** Creates tbl_web_report_files and the detail column on first use. */
    public static function ensureSchema(): void
    {
        if (!Schema::hasTable('tbl_web_report_files')) {
            Schema::create('tbl_web_report_files', function ($table) {
                $table->id();
                $table->unsignedBigInteger('booking_id')->nullable();
                $table->string('booking_no', 50)->nullable();
                $table->unsignedBigInteger('dtl_id')->nullable();
                $table->string('patient_code', 50)->nullable();
                $table->string('patient_name', 255)->nullable();
                $table->string('mobile_no', 50)->nullable();
                $table->string('test_code', 30)->nullable();
                $table->string('test_name', 255)->nullable();
                $table->string('file_type', 30)->default('REPORT_PDF');   // REPORT_PDF | DOCTOR_COPY
                $table->string('file_path', 500);         // relative to storage/app
                $table->string('original_name', 255)->nullable();
                $table->string('file_name', 255);
                $table->unsignedBigInteger('file_size')->default(0);
                $table->string('created_by', 50)->nullable();
                $table->dateTime('created_at')->nullable();
                $table->dateTime('updated_at')->nullable();
                $table->index('booking_id');
                $table->index('booking_no');
                $table->index('patient_code');
                $table->index('dtl_id');
            });
        }

        if (!Schema::hasColumn('tbl_web_report_files', 'file_type')) {
            Schema::table('tbl_web_report_files', function ($table) {
                $table->string('file_type', 30)->default('REPORT_PDF');
                $table->string('original_name', 255)->nullable();
            });
        }

        if (!Schema::hasColumn('tbl_web_booking_dtl', 'report_pdf_path')) {
            Schema::table('tbl_web_booking_dtl', function ($table) {
                $table->string('report_pdf_path', 500)->nullable();
                $table->dateTime('report_pdf_at')->nullable();
            });
        }
    }

    /**
     * Renders the saved report of one booking detail line to PDF and records it.
     * Returns ['path' => relative path, 'file' => file name, 'size' => bytes].
     */
    public static function generate(int $dtlId, ?string $user = null): array
    {
        self::ensureSchema();

        $line = DB::table('tbl_web_booking_dtl')->where('id', $dtlId)->first();
        if (!$line) {
            throw new \RuntimeException('Test line not found.');
        }
        if (empty($line->narrative_html)) {
            throw new \RuntimeException('This test has no saved report yet.');
        }

        $booking = DB::table('tbl_web_booking_hdr')->where('id', $line->booking_id)->first();
        $settings = self::labSettings();

        $bookingNo = trim($booking->booking_no ?? ('BK' . $line->booking_id));
        $folder = self::dir() . DIRECTORY_SEPARATOR . date('Y-m') . DIRECTORY_SEPARATOR . str_replace(['/', '\\'], '-', $bookingNo);
        if (!is_dir($folder)) {
            @mkdir($folder, 0777, true);
        }

        $fileName = trim($line->test_code ?? 'TEST') . '_' . $line->id . '.pdf';
        $fullPath = $folder . DIRECTORY_SEPARATOR . $fileName;

        // Printing on the uploaded letterhead: keep its printed header and footer free
        $letterhead = \App\Services\LetterheadService::dataUri();
        $topMargin = $letterhead ? (float) self::settingValue($settings, 'letterhead_top_mm', 45) : 10;
        $bottomMargin = $letterhead ? (float) self::settingValue($settings, 'letterhead_bottom_mm', 25) : 12;

        $mpdf = new \Mpdf\Mpdf([
            'format' => 'A4',
            'margin_left' => 12,
            'margin_right' => 12,
            'margin_top' => $topMargin,
            'margin_bottom' => $bottomMargin,
            'tempDir' => storage_path('app/private/mpdf'),
            'default_font' => 'dejavusans',
        ]);

        if ($letterhead) {
            $mpdf->SetDefaultBodyCSS('background', 'url("' . $letterhead . '")');
            $mpdf->SetDefaultBodyCSS('background-image-resize', 6);   // stretch over the whole page
        }
        $mpdf->SetTitle(trim($line->test_name ?? 'Report') . ' - ' . trim($booking->patient_name ?? ''));
        $mpdf->SetAuthor($settings['lab_name'] ?? 'Diagnostic Centre');
        $mpdf->WriteHTML(self::buildHtml($line, $booking, $settings, (bool) $letterhead));
        $mpdf->Output($fullPath, \Mpdf\Output\Destination::FILE);

        $relative = 'reports/' . date('Y-m') . '/' . str_replace(['/', '\\'], '-', $bookingNo) . '/' . $fileName;
        $size = is_file($fullPath) ? filesize($fullPath) : 0;

        DB::table('tbl_web_report_files')->updateOrInsert(
            ['dtl_id' => $line->id, 'file_type' => 'REPORT_PDF'],
            [
                'booking_id' => $line->booking_id,
                'booking_no' => $bookingNo,
                'patient_code' => trim($booking->patient_code ?? ''),
                'patient_name' => trim($booking->patient_name ?? ''),
                'mobile_no' => trim($booking->mobile_no ?? ''),
                'test_code' => trim($line->test_code ?? ''),
                'test_name' => trim($line->test_name ?? ''),
                'file_path' => $relative,
                'file_name' => $fileName,
                'file_size' => $size,
                'created_by' => $user,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        DB::table('tbl_web_booking_dtl')->where('id', $line->id)->update([
            'report_pdf_path' => $relative,
            'report_pdf_at' => now(),
        ]);

        return ['path' => $relative, 'file' => $fileName, 'size' => $size];
    }

    /**
     * Stores the doctor's signed copy for a test line, next to that bill's report PDFs.
     *
     * - images are converted to WebP and compressed until the file is **at least 25% smaller**
     *   than the uploaded one
     * - PDFs are kept as they are, up to 3 MB
     *
     * Returns ['path', 'file', 'size', 'original_size', 'saved_percent'].
     */
    public static function storeDoctorCopy(int $dtlId, string $sourcePath, string $extension, string $originalName, ?string $user = null): array
    {
        self::ensureSchema();

        $line = DB::table('tbl_web_booking_dtl')->where('id', $dtlId)->first();
        if (!$line) {
            throw new \RuntimeException('Test line not found.');
        }
        $booking = DB::table('tbl_web_booking_hdr')->where('id', $line->booking_id)->first();

        $extension = strtolower($extension);
        $originalSize = filesize($sourcePath) ?: 0;
        $isPdf = $extension === 'pdf';

        if ($isPdf && $originalSize > 3 * 1024 * 1024) {
            throw new \RuntimeException('PDF is larger than 3 MB (' . round($originalSize / 1048576, 1) . ' MB). Please upload a smaller file.');
        }

        $bookingNo = trim($booking->booking_no ?? ('BK' . $line->booking_id));
        $folder = self::dir() . DIRECTORY_SEPARATOR . date('Y-m') . DIRECTORY_SEPARATOR . str_replace(['/', '\\'], '-', $bookingNo);
        if (!is_dir($folder)) {
            @mkdir($folder, 0777, true);
        }

        $fileName = 'DOCTOR_COPY_' . trim($line->test_code ?? 'TEST') . '_' . $line->id . '.' . ($isPdf ? 'pdf' : 'webp');
        $fullPath = $folder . DIRECTORY_SEPARATOR . $fileName;

        if ($isPdf) {
            if (!copy($sourcePath, $fullPath)) {
                throw new \RuntimeException('Could not save the uploaded PDF.');
            }
        } else {
            self::toWebp($sourcePath, $fullPath, $originalSize);
        }

        $size = filesize($fullPath) ?: 0;
        $relative = 'reports/' . date('Y-m') . '/' . str_replace(['/', '\\'], '-', $bookingNo) . '/' . $fileName;

        DB::table('tbl_web_report_files')->updateOrInsert(
            ['dtl_id' => $line->id, 'file_type' => 'DOCTOR_COPY'],
            [
                'booking_id' => $line->booking_id,
                'booking_no' => $bookingNo,
                'patient_code' => trim($booking->patient_code ?? ''),
                'patient_name' => trim($booking->patient_name ?? ''),
                'mobile_no' => trim($booking->mobile_no ?? ''),
                'test_code' => trim($line->test_code ?? ''),
                'test_name' => trim($line->test_name ?? ''),
                'file_path' => $relative,
                'file_name' => $fileName,
                'original_name' => mb_substr($originalName, 0, 255),
                'file_size' => $size,
                'created_by' => $user,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        return [
            'path' => $relative,
            'file' => $fileName,
            'size' => $size,
            'original_size' => $originalSize,
            'saved_percent' => $originalSize > 0 ? (int) round(100 - ($size / $originalSize * 100)) : 0,
        ];
    }

    /**
     * Writes the image as WebP, lowering quality (and finally the dimensions) until the result is
     * at most 75% of the uploaded file - i.e. at least 25% smaller.
     */
    private static function toWebp(string $sourcePath, string $target, int $originalSize): void
    {
        if (!function_exists('imagewebp')) {
            throw new \RuntimeException('This server cannot convert images (PHP gd/webp is not enabled).');
        }

        $image = @imagecreatefromstring(file_get_contents($sourcePath));
        if (!$image) {
            throw new \RuntimeException('This file is not a readable image.');
        }

        // Photos from phones are far bigger than a report needs
        $width = imagesx($image);
        $height = imagesy($image);
        $maxSide = 2200;
        if (max($width, $height) > $maxSide) {
            $scale = $maxSide / max($width, $height);
            $resized = imagescale($image, (int) round($width * $scale), (int) round($height * $scale));
            if ($resized) {
                imagedestroy($image);
                $image = $resized;
            }
        }

        $budget = (int) floor($originalSize * 0.75);
        foreach ([82, 72, 62, 52, 42, 32, 25] as $quality) {
            imagewebp($image, $target, $quality);
            clearstatcache(true, $target);
            if ($budget <= 0 || filesize($target) <= $budget) {
                imagedestroy($image);
                return;
            }
        }

        // Still too big (tiny original): halve the dimensions once and keep the smaller result
        $small = imagescale($image, max(1, (int) round(imagesx($image) / 2)));
        if ($small) {
            imagewebp($small, $target, 60);
            imagedestroy($small);
        }
        imagedestroy($image);
    }

    /** Absolute path of a stored report PDF, or null when the file is gone. */
    public static function fullPath(?string $relative): ?string
    {
        if (!$relative) {
            return null;
        }
        $path = storage_path('app/' . ltrim(str_replace('\\', '/', $relative), '/'));
        return is_file($path) ? $path : null;
    }

    /** Lab name, address and report footer from tbl_web_settings. */
    private static function labSettings(): array
    {
        try {
            $rows = DB::table('tbl_web_settings')->get();
        } catch (\Throwable $e) {
            return [];
        }

        $settings = [];
        foreach ($rows as $row) {
            $value = $row->setting_value;
            if (($row->setting_type ?? '') === 'json' && !empty($value)) {
                $value = json_decode($value, true) ?? $value;
            }
            $settings[$row->setting_key] = $value;
        }
        return $settings;
    }

    /** The printable document: lab letterhead, patient box, the saved report, signature line. */
    /** One setting value with a fallback. */
    private static function settingValue(array $settings, string $key, $default)
    {
        $value = $settings[$key] ?? null;
        return ($value === null || $value === '') ? $default : $value;
    }

    private static function buildHtml($line, $booking, array $settings, bool $onLetterhead = false): string
    {
        $e = fn ($v) => htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8');

        $age = trim(($booking->age_year ?? '') !== '' ? $booking->age_year . ' Yrs' : '');
        $sex = trim($booking->sex ?? '');
        $date = !empty($booking->booking_date) ? date('d-M-Y', strtotime($booking->booking_date)) : '';

        $head = $onLetterhead ? '' : '<div style="border-bottom:2px solid #000;padding-bottom:6px;margin-bottom:10px;">'
            . '<div style="font-size:17pt;font-weight:bold;text-transform:uppercase;">' . $e($settings['lab_name'] ?? 'Diagnostic Centre') . '</div>'
            . '<div style="font-size:8pt;">' . $e($settings['lab_address'] ?? '') . ' | Phone: ' . $e($settings['lab_phone'] ?? '') . '</div>'
            . '<div style="font-size:8pt;">' . $e($settings['lab_email'] ?? '') . ' ' . $e($settings['lab_website'] ?? '') . '</div>'
            . '</div>';

        $info = '<table width="100%" style="font-size:9pt;border:1px solid #999;margin-bottom:12px;" cellpadding="4">'
            . '<tr><td width="55%"><b>Patient Name:</b> ' . $e($booking->patient_name ?? '') . '</td>'
            . '<td><b>Lab No:</b> ' . $e($booking->booking_no ?? '') . '</td></tr>'
            . '<tr><td><b>Age / Sex:</b> ' . $e(trim("$age / $sex", ' /')) . '</td>'
            . '<td><b>Date:</b> ' . $e($date) . '</td></tr>'
            . '<tr><td><b>Ref. Doctor:</b> ' . $e($booking->doctor_name ?? 'SELF') . '</td>'
            . '<td><b>Contact:</b> ' . $e($booking->mobile_no ?? '') . '</td></tr>'
            . '</table>';

        // The report exactly as it was saved in the editor (Word template layout included).
        // Word's "page:WordSection1" would start a new PDF page for the template, and reports saved
        // before that was stripped still carry it - drop it here as well.
        $report = preg_replace('/(^|[;{\s])page\s*:\s*[^;}]+;?/i', '$1', $line->narrative_html);
        // Word pins letterhead rules with position/z-index, which would sit across the text
        $report = \App\Services\ReportTemplateService::normaliseRules(\App\Services\ReportTemplateService::sanitizeLayout($report));
        $body = '<div>' . $report . '</div>';

        $footer = '<div style="margin-top:24px;border-top:1px solid #999;padding-top:6px;font-size:7.5pt;color:#555;text-align:center;">'
            . $e($settings['report_disclaimer'] ?? 'Suggested clinical correlation and repeat examination if necessary.')
            . '</div>';

        return '<html><head><meta charset="utf-8"></head><body style="font-family:dejavusans;font-size:10pt;">'
            . $head . $info . $body . $footer . '</body></html>';
    }
}
