<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * In-app notifications (bell icon in the top bar + the Notifications page).
 *
 * One row per receiver, so "read" is per user. Notifications are created when work moves between
 * people: a report is sent back for correction, a corrected report is saved again, a report is
 * approved.
 */
class NotificationService
{
    const TABLE = 'tbl_web_notifications';

    public static function ensureSchema(): void
    {
        if (Schema::hasTable(self::TABLE)) {
            return;
        }

        Schema::create(self::TABLE, function ($table) {
            $table->id();
            $table->string('user_code', 50);            // receiver
            $table->string('type', 40);                 // REPORT_SENT_BACK | REPORT_RESUBMITTED | REPORT_APPROVED
            $table->string('title', 150);
            $table->text('message')->nullable();
            $table->string('link', 300)->nullable();    // page that opens on click
            $table->string('ref_type', 40)->nullable(); // BOOKING_DTL
            $table->string('ref_id', 50)->nullable();
            $table->string('created_by', 50)->nullable();
            $table->string('created_by_name', 100)->nullable();
            $table->dateTime('created_at')->nullable();
            $table->dateTime('read_at')->nullable();
            $table->index('user_code');
            $table->index(['user_code', 'read_at']);
        });
    }

    /**
     * Sends one notification to each receiver (duplicate receivers are ignored).
     * With 'dedupe' => true an unread notification of the same type for the same record is not
     * repeated - saving a report five times must not fill the bell five times.
     */
    public static function send(array $userCodes, array $payload): int
    {
        self::ensureSchema();

        $rows = [];
        foreach (array_unique(array_filter(array_map('trim', $userCodes))) as $code) {
            if ($code === ($payload['created_by'] ?? null)) {
                continue;   // no need to tell someone what they just did themselves
            }
            if (!empty($payload['dedupe']) && !empty($payload['ref_id'])) {
                $already = DB::table(self::TABLE)
                    ->where('user_code', $code)
                    ->where('type', $payload['type'] ?? 'INFO')
                    ->where('ref_id', (string) $payload['ref_id'])
                    ->whereNull('read_at')
                    ->exists();
                if ($already) {
                    continue;
                }
            }
            $rows[] = [
                'user_code' => $code,
                'type' => $payload['type'] ?? 'INFO',
                'title' => mb_substr($payload['title'] ?? 'Notification', 0, 150),
                'message' => $payload['message'] ?? null,
                'link' => $payload['link'] ?? null,
                'ref_type' => $payload['ref_type'] ?? null,
                'ref_id' => isset($payload['ref_id']) ? (string) $payload['ref_id'] : null,
                'created_by' => $payload['created_by'] ?? null,
                'created_by_name' => $payload['created_by_name'] ?? null,
                'created_at' => now(),
                'read_at' => null,
            ];
        }

        if (!$rows) {
            return 0;
        }

        try {
            DB::table(self::TABLE)->insert($rows);
            return count($rows);
        } catch (\Throwable $e) {
            Log::warning('Notification not sent: ' . $e->getMessage());
            return 0;
        }
    }

    /** User codes of everyone who approves reports: the Report Approval module holders and admins. */
    public static function approvers(): array
    {
        try {
            $module = DB::table('tbl_web_user_module_access')->where('module_key', 'report_approval')->pluck('user_code')->all();
            $admins = DB::table('tbl_web_users')->where('role_code', 'ADMIN')->where('status', 'ACTIVE')->pluck('user_code')->all();
            return array_values(array_unique(array_merge($module, $admins)));
        } catch (\Throwable $e) {
            return [];
        }
    }

    /** The user code behind a stored user name (result_entered_by, verified_by ... hold names). */
    public static function codeForName(?string $name): ?string
    {
        $name = trim((string) $name);
        if ($name === '' || strcasecmp($name, 'System') === 0) {
            return null;
        }

        try {
            return DB::table('tbl_web_users')
                ->where('username', $name)
                ->orWhere('full_name', $name)
                ->value('user_code');
        } catch (\Throwable $e) {
            return null;
        }
    }
}
