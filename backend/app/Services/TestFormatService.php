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

        foreach ($params as $i => $p) {
            $params[$i]['ranges'] = ($ranges[$p['id']] ?? collect())->map(fn ($r) => (array) $r)->values()->all();
        }

        return ['format' => (array) $format, 'parameters' => $params];
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
