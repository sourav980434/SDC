<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Test report formats kept in the database (replaces choosing a Word template per report).
 *
 *   tbl_web_test_formats       one row per test: type (TABLE / NARRATIVE), specimen, notes, narrative text
 *   tbl_web_test_parameters    the result rows of a TABLE test (parameters and group headings)
 *   tbl_web_test_param_ranges  numeric reference ranges per parameter (sex / age)
 *   tbl_web_test_format_history snapshot of a format on every import / save
 */
class TestFormatService
{
    public const STATUS_OK = 'OK';          // imported cleanly
    public const STATUS_CHECK = 'CHECK';    // imported, but the lab staff should look at it first
    public const STATUS_FAILED = 'FAILED';  // template could not be read

    public static function ensureSchema(): void
    {
        if (!Schema::hasTable('tbl_web_test_formats')) {
            Schema::create('tbl_web_test_formats', function ($table) {
                $table->id();
                $table->string('test_code', 30)->unique();
                $table->string('test_name', 255)->nullable();
                $table->string('dept_code', 30)->nullable();
                $table->string('format_type', 20)->default('TABLE');   // TABLE | NARRATIVE
                $table->string('specimen', 150)->nullable();
                $table->text('notes_html')->nullable();                // printed under the result table
                $table->text('narrative_html')->nullable();            // default text of a NARRATIVE report
                $table->string('source_file', 255)->nullable();        // Word template it was imported from
                $table->text('source_html')->nullable();               // the whole template, for staff to refer to
                $table->unsignedInteger('source_sections')->default(1);
                $table->string('import_status', 20)->default(self::STATUS_OK);
                $table->text('import_notes')->nullable();              // why it needs a check
                $table->boolean('is_checked')->default(false);
                $table->string('checked_by', 50)->nullable();
                $table->dateTime('checked_at')->nullable();
                $table->boolean('is_edited')->default(false);          // edited by staff: re-import leaves it alone
                $table->string('created_by', 50)->nullable();
                $table->dateTime('created_at')->nullable();
                $table->string('updated_by', 50)->nullable();
                $table->dateTime('updated_at')->nullable();
                $table->index('import_status');
            });
        }

        if (!Schema::hasTable('tbl_web_test_parameters')) {
            Schema::create('tbl_web_test_parameters', function ($table) {
                $table->id();
                $table->string('test_code', 30);
                $table->unsignedInteger('sort_order')->default(0);
                $table->string('row_type', 20)->default('PARAM');      // PARAM | HEADING
                $table->string('name', 255);
                $table->string('method', 255)->nullable();
                $table->string('unit', 60)->nullable();
                $table->string('result_type', 20)->default('NUMERIC'); // NUMERIC | TEXT | OPTIONS | FORMULA
                $table->text('options')->nullable();                   // OPTIONS: one choice per line
                $table->string('default_value', 255)->nullable();
                $table->text('ref_text')->nullable();                  // reference range exactly as printed
                $table->unsignedTinyInteger('decimals')->nullable();
                $table->string('formula', 255)->nullable();
                $table->unsignedTinyInteger('indent')->default(0);
                $table->boolean('is_bold')->default(false);
                $table->boolean('is_active')->default(true);
                $table->index(['test_code', 'sort_order']);
            });
        }

        if (!Schema::hasTable('tbl_web_test_param_ranges')) {
            Schema::create('tbl_web_test_param_ranges', function ($table) {
                $table->id();
                $table->unsignedBigInteger('parameter_id');
                $table->string('sex', 1)->default('A');                // A (all) | M | F
                $table->decimal('age_from', 8, 2)->nullable();
                $table->decimal('age_to', 8, 2)->nullable();
                $table->string('age_unit', 1)->default('Y');           // Y | M | D
                $table->decimal('low', 14, 4)->nullable();
                $table->decimal('high', 14, 4)->nullable();
                $table->decimal('panic_low', 14, 4)->nullable();
                $table->decimal('panic_high', 14, 4)->nullable();
                $table->index('parameter_id');
            });
        }

        if (!Schema::hasTable('tbl_web_test_format_history')) {
            Schema::create('tbl_web_test_format_history', function ($table) {
                $table->id();
                $table->string('test_code', 30);
                $table->string('action', 20);                          // IMPORT | EDIT
                $table->text('snapshot');                              // JSON of format + parameters + ranges
                $table->string('created_by', 50)->nullable();
                $table->dateTime('created_at')->nullable();
                $table->index('test_code');
            });
        }
    }

    public static function exists(string $testCode): bool
    {
        return DB::table('tbl_web_test_formats')->where('test_code', $testCode)->exists();
    }

    /** Format + parameters (each with its ranges) of one test, or null when it has none. */
    public static function get(string $testCode): ?array
    {
        $format = DB::table('tbl_web_test_formats')->where('test_code', $testCode)->first();
        if (!$format) {
            return null;
        }

        $params = DB::table('tbl_web_test_parameters')
            ->where('test_code', $testCode)
            ->orderBy('sort_order')
            ->get()
            ->map(fn ($p) => (array) $p)
            ->all();

        $ranges = $params
            ? DB::table('tbl_web_test_param_ranges')->whereIn('parameter_id', array_column($params, 'id'))->get()->groupBy('parameter_id')
            : collect();

        // SQL Server hands bits, ids and decimals back as strings
        $num = fn ($v) => $v === null ? null : (float) $v;
        foreach ($params as $i => $p) {
            $params[$i]['id'] = (int) $p['id'];
            $params[$i]['sort_order'] = (int) $p['sort_order'];
            $params[$i]['indent'] = (int) $p['indent'];
            $params[$i]['decimals'] = $p['decimals'] === null ? null : (int) $p['decimals'];
            $params[$i]['is_bold'] = (bool) $p['is_bold'];
            $params[$i]['is_active'] = (bool) $p['is_active'];
            $params[$i]['ranges'] = ($ranges[$p['id']] ?? collect())->map(function ($r) use ($num) {
                $r = (array) $r;
                foreach (['age_from', 'age_to', 'low', 'high', 'panic_low', 'panic_high'] as $k) {
                    $r[$k] = $num($r[$k]);
                }
                $r['id'] = (int) $r['id'];
                $r['parameter_id'] = (int) $r['parameter_id'];
                return $r;
            })->values()->all();
        }

        $format = (array) $format;
        $format['id'] = (int) $format['id'];
        $format['source_sections'] = (int) $format['source_sections'];
        foreach (['is_checked', 'is_edited'] as $k) {
            $format[$k] = (bool) $format[$k];
        }

        return ['format' => $format, 'parameters' => $params];
    }

    /** Test code => [format_type, import_status, is_checked, is_edited, params] for the Test Master list. */
    public static function overview(): array
    {
        $params = DB::table('tbl_web_test_parameters')
            ->where('row_type', 'PARAM')
            ->groupBy('test_code')
            ->select('test_code', DB::raw('COUNT(*) as n'))
            ->pluck('n', 'test_code');

        $list = [];
        foreach (DB::table('tbl_web_test_formats')->get(['test_code', 'format_type', 'import_status', 'is_checked', 'is_edited']) as $f) {
            $list[$f->test_code] = [
                'format_type' => $f->format_type,
                'import_status' => $f->import_status,
                'is_checked' => (bool) $f->is_checked,
                'is_edited' => (bool) $f->is_edited,
                'params' => (int) ($params[$f->test_code] ?? 0),
            ];
        }
        return $list;
    }

    /**
     * Checks and cleans a format posted from the Test Master. Returns [data, error]:
     * data is ready for save(), error is a message for the user (data is null then).
     */
    public static function fromInput(array $input): array
    {
        $str = fn ($v, $max) => ($v = trim((string) ($v ?? ''))) === '' ? null : mb_substr($v, 0, $max);
        $num = function ($v) {
            if ($v === null || trim((string) $v) === '') {
                return null;
            }
            $v = str_replace(',', '', trim((string) $v));
            return is_numeric($v) ? (float) $v : false;
        };

        $f = $input['format'] ?? [];
        $type = strtoupper($f['format_type'] ?? 'TABLE') === 'NARRATIVE' ? 'NARRATIVE' : 'TABLE';
        $format = [
            'format_type' => $type,
            'specimen' => $str($f['specimen'] ?? null, 150),
            'notes_html' => TemplateImportService::sanitizeHtml($f['notes_html'] ?? null),
            'narrative_html' => TemplateImportService::sanitizeHtml($f['narrative_html'] ?? null),
        ];

        $parameters = [];
        foreach (array_values($input['parameters'] ?? []) as $i => $p) {
            $row = $i + 1;
            $name = $str($p['name'] ?? null, 255);
            if (!$name) {
                return [null, "Row $row: please enter the parameter name (or delete the empty row)."];
            }
            $rowType = strtoupper($p['row_type'] ?? 'PARAM') === 'HEADING' ? 'HEADING' : 'PARAM';
            $resultType = strtoupper($p['result_type'] ?? 'NUMERIC');
            if (!in_array($resultType, ['NUMERIC', 'TEXT', 'OPTIONS', 'FORMULA'], true)) {
                $resultType = 'NUMERIC';
            }
            $options = $str($p['options'] ?? null, 4000);
            if ($rowType === 'PARAM' && $resultType === 'OPTIONS' && !$options) {
                return [null, "$name: a dropdown parameter needs its choices (one per line)."];
            }
            $decimals = $p['decimals'] ?? null;
            $decimals = $decimals === null || $decimals === '' ? null : max(0, min(6, (int) $decimals));

            $ranges = [];
            foreach (array_values($p['ranges'] ?? []) as $r) {
                $values = [];
                foreach (['age_from', 'age_to', 'low', 'high', 'panic_low', 'panic_high'] as $k) {
                    $values[$k] = $num($r[$k] ?? null);
                    if ($values[$k] === false) {
                        return [null, "$name: \"" . $r[$k] . '" is not a number.'];
                    }
                }
                if ($values['low'] === null && $values['high'] === null) {
                    continue;   // a blank range line
                }
                if ($values['low'] !== null && $values['high'] !== null && $values['low'] > $values['high']) {
                    return [null, "$name: the low value ({$values['low']}) is more than the high value ({$values['high']})."];
                }
                if ($values['age_from'] !== null && $values['age_to'] !== null && $values['age_from'] > $values['age_to']) {
                    return [null, "$name: the age \"from\" is more than the age \"to\"."];
                }
                $sex = strtoupper($r['sex'] ?? 'A');
                $unit = strtoupper($r['age_unit'] ?? 'Y');
                $ranges[] = $values + [
                    'sex' => in_array($sex, ['M', 'F'], true) ? $sex : 'A',
                    'age_unit' => in_array($unit, ['D', 'M'], true) ? $unit : 'Y',
                ];
            }

            $parameters[] = [
                'row_type' => $rowType,
                'name' => $name,
                'method' => $rowType === 'PARAM' ? $str($p['method'] ?? null, 255) : null,
                'unit' => $rowType === 'PARAM' ? $str($p['unit'] ?? null, 60) : null,
                'result_type' => $resultType,
                'options' => $resultType === 'OPTIONS' ? $options : null,
                'default_value' => $rowType === 'PARAM' ? $str($p['default_value'] ?? null, 255) : null,
                'ref_text' => $rowType === 'PARAM' ? $str($p['ref_text'] ?? null, 4000) : null,
                'decimals' => $decimals,
                'formula' => $resultType === 'FORMULA' ? $str($p['formula'] ?? null, 255) : null,
                'indent' => max(0, min(3, (int) ($p['indent'] ?? 0))),
                'is_bold' => !empty($p['is_bold']),
                'is_active' => !array_key_exists('is_active', $p) || !empty($p['is_active']),
                'ranges' => $rowType === 'PARAM' ? $ranges : [],
            ];
        }

        if ($type === 'TABLE' && !array_filter($parameters, fn ($p) => $p['row_type'] === 'PARAM')) {
            return [null, 'A table report needs at least one parameter. Add one, or change the report type to Narrative.'];
        }
        if ($type === 'NARRATIVE') {
            $parameters = [];
        }

        return [['format' => $format, 'parameters' => $parameters], null];
    }

    /** Marks a format as checked (or not) by the lab staff. */
    public static function setChecked(string $testCode, bool $checked, ?string $user): void
    {
        DB::table('tbl_web_test_formats')->where('test_code', $testCode)->update([
            'is_checked' => $checked,
            'checked_by' => $checked ? $user : null,
            'checked_at' => $checked ? now() : null,
        ]);
    }

    public static function history(string $testCode): array
    {
        return DB::table('tbl_web_test_format_history')
            ->where('test_code', $testCode)
            ->orderByDesc('id')
            ->limit(50)
            ->get(['id', 'action', 'created_by', 'created_at'])
            ->map(fn ($h) => (array) $h)
            ->all();
    }

    public static function historySnapshot(int $id): ?array
    {
        $row = DB::table('tbl_web_test_format_history')->where('id', $id)->first();
        return $row ? ['test_code' => $row->test_code] + (json_decode($row->snapshot, true) ?: []) : null;
    }

    /**
     * Writes one test's format, replacing its parameters. $data = [format => [...], parameters => [[..., ranges => [...]]]].
     * Runs in one transaction and records a history snapshot.
     */
    public static function save(string $testCode, array $data, string $action, ?string $user = null): void
    {
        $now = now();
        DB::transaction(function () use ($testCode, $data, $action, $user, $now) {
            $format = $data['format'];
            $format['test_code'] = $testCode;
            $format['updated_by'] = $user;
            $format['updated_at'] = $now;

            if (self::exists($testCode)) {
                DB::table('tbl_web_test_formats')->where('test_code', $testCode)->update($format);
            } else {
                $format['created_by'] = $user;
                $format['created_at'] = $now;
                DB::table('tbl_web_test_formats')->insert($format);
            }

            $oldIds = DB::table('tbl_web_test_parameters')->where('test_code', $testCode)->pluck('id')->all();
            if ($oldIds) {
                DB::table('tbl_web_test_param_ranges')->whereIn('parameter_id', $oldIds)->delete();
                DB::table('tbl_web_test_parameters')->where('test_code', $testCode)->delete();
            }

            foreach (array_values($data['parameters'] ?? []) as $i => $param) {
                $ranges = $param['ranges'] ?? [];
                unset($param['ranges'], $param['id']);
                $param['test_code'] = $testCode;
                $param['sort_order'] = $i + 1;
                $id = DB::table('tbl_web_test_parameters')->insertGetId($param);
                foreach ($ranges as $range) {
                    unset($range['id']);
                    $range['parameter_id'] = $id;
                    DB::table('tbl_web_test_param_ranges')->insert($range);
                }
            }

            $snapshot = self::get($testCode);
            unset($snapshot['format']['source_html']);   // the template itself never changes, no need to copy it each time
            DB::table('tbl_web_test_format_history')->insert([
                'test_code' => $testCode,
                'action' => $action,
                'snapshot' => json_encode($snapshot, JSON_UNESCAPED_UNICODE),
                'created_by' => $user,
                'created_at' => $now,
            ]);
        });
    }
}
