<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Reports made from the Test Format Master (Report Entry -> Report Approval -> Print).
 *
 * A booking detail line keeps its report in tbl_web_booking_dtl.report_json:
 *   format      the test's format as it was when the report was started (a snapshot, so later
 *               changes in the Test Format Master never change a report already written)
 *   parameters  the parameters of that snapshot, with their ranges
 *   values      result per parameter id
 *   flags       H / L / PH / PL (panic) per parameter id, worked out on save
 *   patient     sex and age the ranges were picked for
 *
 * State of a line: PENDING (nothing saved) -> DRAFT -> SUBMITTED -> APPROVED, or SENT_BACK by the
 * approver (then DRAFT-like again until it is submitted once more). The approval columns are the
 * ones of the Report Approval module (ensureApprovalColumns in routes/web.php).
 */
class ReportEntryService
{
    public const STATES = ['PENDING', 'DRAFT', 'SUBMITTED', 'SENT_BACK', 'APPROVED'];

    public static function ensureSchema(): void
    {
        Cache::rememberForever('dtl_report_entry_columns_ready', function () {
            if (!Schema::hasColumn('tbl_web_booking_dtl', 'report_json')) {
                Schema::table('tbl_web_booking_dtl', function ($table) {
                    $table->text('report_json')->nullable();
                    $table->dateTime('report_saved_at')->nullable();
                    $table->string('report_saved_by', 50)->nullable();
                    $table->dateTime('report_submitted_at')->nullable();
                    $table->string('report_submitted_by', 50)->nullable();
                    $table->string('report_doctor', 500)->nullable();   // JSON {name, designation} chosen at approval
                });
            }
            return true;
        });
    }

    /**
     * The random token of a booking's report link (QR code on the report -> /r/{token}), made on
     * first use. 32 hex characters: cannot be guessed from a booking number.
     */
    public static function bookingToken(int $bookingId): ?string
    {
        Cache::rememberForever('hdr_report_token_column_ready', function () {
            if (!Schema::hasColumn('tbl_web_booking_hdr', 'report_token')) {
                Schema::table('tbl_web_booking_hdr', function ($table) {
                    $table->string('report_token', 32)->nullable()->index();
                });
            }
            return true;
        });

        $token = DB::table('tbl_web_booking_hdr')->where('id', $bookingId)->value('report_token');
        if ($token) {
            return $token;
        }
        $token = bin2hex(random_bytes(16));
        $updated = DB::table('tbl_web_booking_hdr')->where('id', $bookingId)->whereNull('report_token')->update(['report_token' => $token]);
        // Two screens at once: keep whichever token was written first
        return $updated ? $token : DB::table('tbl_web_booking_hdr')->where('id', $bookingId)->value('report_token');
    }

    /**
     * Reporting doctors who can sign a report of this department: the in-house doctors of the
     * Doctor Master that may sign (SignIn = 1, active), with their designation.
     * Same department first; else a department with the same name ("DIGITAL X-RAY" -> "X RAY");
     * else every reporting doctor, so a report is never stuck without one.
     */
    public static function doctorsFor(?string $deptCode): array
    {
        $all = Cache::remember('report_signing_doctors', 300, function () {
            return DB::table('MDoctor as d')
                ->leftJoin('MDesignation as g', 'd.DesigCode', '=', 'g.Code')
                ->leftJoin('MDepartment as m', 'd.DeptCode', '=', 'm.Code')
                ->where('d.SignIn', '1')
                ->where('d.Status', '1')
                ->orderBy('d.DoctName')
                ->get(['d.Code as code', 'd.Prefix as prefix', 'd.DoctName as name', 'd.Qua as qua', 'g.Descr as designation', 'd.DeptCode as dept_code', 'm.Descr as dept_name'])
                ->map(fn ($d) => [
                    'code' => trim((string) $d->code),
                    'name' => trim(trim((string) $d->prefix) . ' ' . trim((string) $d->name)),
                    'designation' => trim(ucwords(strtolower(trim((string) $d->designation)))
                        . (trim((string) $d->qua) !== '' ? ', ' . trim((string) $d->qua) : ''), ', '),
                    'deptCode' => trim((string) $d->dept_code),
                    'deptName' => trim((string) $d->dept_name),
                ])
                ->all();
        });

        $dept = strtoupper(trim((string) $deptCode));
        $same = array_values(array_filter($all, fn ($d) => strtoupper($d['deptCode']) === $dept));
        if ($same) {
            return $same;
        }
        $norm = fn ($s) => preg_replace('/[^A-Z]/', '', str_replace('DIGITAL', '', strtoupper((string) $s)));
        $deptName = DB::table('MDepartment')->where('Code', $deptCode)->value('Descr');
        $alike = $deptName ? array_values(array_filter($all, fn ($d) => $d['deptName'] !== '' && $norm($d['deptName']) === $norm($deptName))) : [];
        return $alike ?: $all;
    }

    /** The doctor with this code, if they may sign reports of this department. */
    public static function doctorByCode(?string $code, ?string $deptCode): ?array
    {
        foreach (self::doctorsFor($deptCode) as $d) {
            if ($d['code'] === trim((string) $code)) {
                return ['code' => $d['code'], 'name' => $d['name'], 'designation' => $d['designation']];
            }
        }
        return null;
    }

    /** SQL condition for a state, on a query that has tbl_web_booking_dtl as "d". */
    public static function whereState($query, string $state)
    {
        switch (strtoupper($state)) {
            case 'PENDING':
                return $query->whereNull('d.report_json');
            case 'DRAFT':
                return $query->whereNotNull('d.report_json')->whereNull('d.report_submitted_at')
                    ->whereNull('d.report_approved_at')->whereNull('d.report_sent_back_at');
            case 'SUBMITTED':
                return $query->whereNotNull('d.report_submitted_at')->whereNull('d.report_approved_at')->whereNull('d.report_sent_back_at');
            case 'SENT_BACK':
                return $query->whereNotNull('d.report_json')->whereNotNull('d.report_sent_back_at')->whereNull('d.report_approved_at');
            case 'APPROVED':
                return $query->whereNotNull('d.report_json')->whereNotNull('d.report_approved_at');
        }
        return $query;
    }

    public static function stateOf($row): string
    {
        if (empty($row->report_json)) {
            return 'PENDING';
        }
        if (!empty($row->report_approved_at)) {
            return 'APPROVED';
        }
        if (!empty($row->report_sent_back_at)) {
            return 'SENT_BACK';
        }
        if (!empty($row->report_submitted_at)) {
            return 'SUBMITTED';
        }
        return 'DRAFT';
    }

    /** Sex (M / F / '') and age (value + Y / M / D) of a booking header. */
    public static function patientOf($hdr): array
    {
        $sex = strtoupper(substr(trim((string) ($hdr->sex ?? '')), 0, 1));
        $age = null;
        $unit = 'Y';
        foreach (['age_year' => 'Y', 'age_month' => 'M', 'age_day' => 'D'] as $col => $u) {
            if (isset($hdr->$col) && $hdr->$col !== null && $hdr->$col !== '') {
                $age = (float) $hdr->$col;
                $unit = $u;
                break;
            }
        }
        return [
            'prefix' => trim((string) ($hdr->patient_prefix ?? '')),
            'name' => trim((string) ($hdr->patient_name ?? '')),
            'sex' => in_array($sex, ['M', 'F'], true) ? $sex : '',
            'age' => $age,
            'age_unit' => $unit,
            'referred_by' => trim((string) ($hdr->doctor_name ?? '')) ?: 'Self',
            'mobile' => trim((string) ($hdr->mobile_no ?? '')),
            'booking_no' => trim((string) ($hdr->booking_no ?? '')),
            'booking_date' => $hdr->booking_date ?? null,
            'patient_code' => trim((string) ($hdr->patient_code ?? '')),
        ];
    }

    /** Patient age in days (for age windows of the ranges). */
    public static function ageDays(?float $age, string $unit): ?float
    {
        if ($age === null) {
            return null;
        }
        return $age * (['D' => 1, 'M' => 30.4375, 'Y' => 365.25][$unit] ?? 365.25);
    }

    /** Same choice as frontend lib/reportRanges.js pickRange: age + sex, age, sex, all. */
    public static function pickRange(array $ranges, string $sex, ?float $days): ?array
    {
        $best = null;
        $bestScore = -1;
        foreach ($ranges as $r) {
            if (($r['low'] ?? null) === null && ($r['high'] ?? null) === null) {
                continue;
            }
            $from = $r['age_from'] ?? null;
            $to = $r['age_to'] ?? null;
            $window = null;
            if ($from !== null || $to !== null) {
                if ($days === null) {
                    continue;
                }
                $factor = ['D' => 1, 'M' => 30.4375, 'Y' => 365.25][$r['age_unit'] ?? 'Y'] ?? 365.25;
                if (($from !== null && $days < $from * $factor) || ($to !== null && $days > $to * $factor)) {
                    continue;
                }
                $window = true;
            }
            $rs = $r['sex'] ?? 'A';
            if ($rs !== 'A' && $rs !== $sex) {
                continue;
            }
            $score = ($window ? 2 : 0) + ($rs !== 'A' ? 1 : 0);
            if ($score > $bestScore) {
                $best = $r;
                $bestScore = $score;
            }
        }
        return $best;
    }

    /** '' | 'H' | 'L' | 'PH' | 'PL' (panic high / low) for a value. */
    public static function flag($value, ?array $range): string
    {
        $v = str_replace(',', '', trim((string) $value));
        if ($range === null || $v === '' || !is_numeric($v)) {
            return '';
        }
        $v = (float) $v;
        if (($range['panic_low'] ?? null) !== null && $v <= $range['panic_low']) {
            return 'PL';
        }
        if (($range['panic_high'] ?? null) !== null && $v >= $range['panic_high']) {
            return 'PH';
        }
        if (($range['low'] ?? null) !== null && $v < $range['low']) {
            return 'L';
        }
        if (($range['high'] ?? null) !== null && $v > $range['high']) {
            return 'H';
        }
        return '';
    }

    /** The current Test Format Master format of a test as a report snapshot, or null. */
    public static function formatSnapshot(string $testCode): ?array
    {
        $data = TestFormatService::get($testCode);
        if (!$data) {
            return null;
        }
        $f = $data['format'];
        return [
            'format' => [
                'format_type' => $f['format_type'],
                'specimen' => $f['specimen'],
                'notes_html' => $f['notes_html'],
                'narrative_html' => $f['narrative_html'],
                'updated_at' => $f['updated_at'] ?? null,
            ],
            'parameters' => array_values(array_filter(array_map(function ($p) {
                unset($p['test_code'], $p['sort_order']);
                $p['ranges'] = array_map(fn ($r) => array_diff_key($r, ['id' => 1, 'parameter_id' => 1]), $p['ranges']);
                return $p;
            }, $data['parameters']), fn ($p) => $p['row_type'] === 'HEADING' || $p['is_active'])),
        ];
    }

    /**
     * Builds the report_json to store from the snapshot and what was typed, and the old-style
     * result_json / result_flag the other screens (pending register, dashboard) still read.
     */
    public static function build(array $snapshot, array $values, ?string $narrativeHtml, ?string $notesHtml, array $patient): array
    {
        $days = self::ageDays($patient['age'], $patient['age_unit']);
        $clean = [];
        $flags = [];
        $resultJson = [];
        $overall = 'NORMAL';

        foreach ($snapshot['parameters'] as $p) {
            if ($p['row_type'] !== 'PARAM') {
                continue;
            }
            $key = (string) $p['id'];
            $value = mb_substr(trim((string) ($values[$key] ?? '')), 0, 255);
            $clean[$key] = $value;

            $range = in_array($p['result_type'], ['NUMERIC', 'FORMULA'], true) ? self::pickRange($p['ranges'] ?? [], $patient['sex'], $days) : null;
            $flag = self::flag($value, $range);
            if ($flag !== '') {
                $flags[$key] = $flag;
            }
            if ($flag === 'PH' || $flag === 'PL') {
                $overall = 'CRITICAL';
            } elseif ($overall !== 'CRITICAL' && $flag !== '') {
                $overall = $flag === 'H' ? 'HIGH' : ($overall === 'HIGH' ? 'HIGH' : 'LOW');
            }

            $resultJson[] = [
                'param_code' => $key,
                'param_name' => $p['name'],
                'value' => $value,
                'unit' => $p['unit'],
                'ref_range' => $p['ref_text'],
                'flag' => ['H' => 'HIGH', 'L' => 'LOW', 'PH' => 'CRITICAL_HIGH', 'PL' => 'CRITICAL_LOW'][$flag] ?? 'NORMAL',
            ];
        }

        $format = $snapshot['format'];
        if ($format['format_type'] === 'NARRATIVE') {
            $format['narrative_html'] = TemplateImportService::sanitizeHtml($narrativeHtml) ?? $format['narrative_html'];
        } elseif ($notesHtml !== null) {
            $format['notes_html'] = TemplateImportService::sanitizeHtml($notesHtml);
        }

        return [
            'report' => [
                'format' => $format,
                'parameters' => $snapshot['parameters'],
                'values' => $clean,
                'flags' => $flags,
                'patient' => ['sex' => $patient['sex'], 'age' => $patient['age'], 'age_unit' => $patient['age_unit']],
            ],
            'result_json' => $resultJson,
            'result_flag' => $overall,
        ];
    }

    /** Whether a result is typed for every parameter (narrative reports: always true). */
    public static function missingValues(array $report): array
    {
        if (($report['format']['format_type'] ?? '') === 'NARRATIVE') {
            return [];
        }
        $missing = [];
        foreach ($report['parameters'] as $p) {
            if ($p['row_type'] === 'PARAM' && trim((string) ($report['values'][(string) $p['id']] ?? '')) === '') {
                $missing[] = $p['name'];
            }
        }
        return $missing;
    }
}
