<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Records every data-changing API call (POST / PUT / PATCH / DELETE) in tbl_web_audit_logs with
 * the user code, user name, time, IP and what was changed.
 *
 * Routes that already write a detailed line themselves (logAuditLog) are not logged twice -
 * that helper sets $GLOBALS['audit_logged'].
 */
class AuditLogMiddleware
{
    /** Request fields that must never reach the log. */
    const SECRET_FIELDS = ['password', 'new_password', 'old_password', 'confirm_password', 'password_confirmation', 'token'];

    /** Long fields worth recording only by size. */
    const BULKY_FIELDS = ['html', 'narrative_html', 'file', 'template_html', 'results', 'image'];

    public function handle(Request $request, Closure $next)
    {
        $GLOBALS['audit_logged'] = false;

        $response = $next($request);

        if ($this->shouldLog($request)) {
            $this->write($request, $response);
        }

        return $response;
    }

    private function shouldLog(Request $request): bool
    {
        if (!$request->is('api/*') || !in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            return false;
        }
        // The route wrote its own, more descriptive line
        if (!empty($GLOBALS['audit_logged'])) {
            return false;
        }
        // Login / logout write their own lines, with the failure reason
        return !$request->is('api/auth/*');
    }

    private function write(Request $request, $response): void
    {
        try {
            $path = trim($request->path(), '/');                 // api/master/doctors/D0000390
            $parts = array_slice(explode('/', $path), 1);        // [master, doctors, D0000390]
            $module = strtoupper(str_replace('-', '_', $parts[0] ?? 'API'));
            if (in_array($module, ['MASTER', 'SETUP', 'LAB', 'SAMPLE_TRACKING'], true) && !empty($parts[1])) {
                $module .= '_' . strtoupper(str_replace('-', '_', $parts[1]));
            }

            $status = method_exists($response, 'getStatusCode') ? $response->getStatusCode() : 200;
            $action = $this->action($request, $parts, $status);

            $description = strtoupper($request->method()) . ' /' . $path
                . ' | ' . $this->payloadSummary($request)
                . ' | status ' . $status;

            DB::table('tbl_web_audit_logs')->insert([
                'user_code' => $request->header('X-User-Code') ?: 'SYSTEM',
                'username' => $request->header('X-User-Name') ?: 'SYSTEM',
                'module_name' => substr($module, 0, 50),
                'action_type' => $action,
                'description' => mb_substr($description, 0, 1000),
                'ip_address' => $request->ip(),
                'created_at' => now(),
            ]);
        } catch (\Throwable $e) {
            // Logging must never break the request
        }
    }

    private function action(Request $request, array $parts, int $status): string
    {
        if ($status >= 400) {
            return 'FAILED';
        }

        $last = strtolower(end($parts) ?: '');
        foreach (['delete' => 'DELETE', 'remove' => 'DELETE', 'save' => 'SAVE', 'update' => 'UPDATE',
                  'upload' => 'UPLOAD', 'replace' => 'REPLACE', 'approve' => 'APPROVE', 'verify' => 'VERIFY',
                  'login' => 'LOGIN', 'migrate' => 'MIGRATE'] as $needle => $action) {
            if (str_contains($last, $needle)) {
                return $action;
            }
        }

        return match ($request->method()) {
            'POST' => 'CREATE',
            'PUT', 'PATCH' => 'UPDATE',
            'DELETE' => 'DELETE',
            default => 'CHANGE',
        };
    }

    /** Short, readable summary of what was sent - secrets masked, long values shown as a size. */
    private function payloadSummary(Request $request): string
    {
        $data = $request->except(self::SECRET_FIELDS);
        $pairs = [];

        foreach ($data as $key => $value) {
            if (in_array($key, self::BULKY_FIELDS, true)) {
                $pairs[] = $key . '=' . (is_string($value) ? strlen($value) . ' chars' : 'data');
                continue;
            }
            if (is_array($value) || is_object($value)) {
                $pairs[] = $key . '=' . count((array) $value) . ' items';
                continue;
            }
            $pairs[] = $key . '=' . mb_substr((string) $value, 0, 60);
        }

        foreach ($request->allFiles() as $key => $file) {
            $one = is_array($file) ? ($file[0] ?? null) : $file;
            if ($one) {
                $pairs[] = $key . '=' . $one->getClientOriginalName() . ' (' . (int) ceil($one->getSize() / 1024) . ' KB)';
            }
        }

        return $pairs ? implode(', ', array_slice($pairs, 0, 12)) : 'no payload';
    }
}
