<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * The lab's printed letterhead: one full A4 image that every report is printed on.
 *
 * The image lives next to the other settings (storage/app/settings/letterhead.<ext>) and its file
 * name is kept in tbl_web_settings so print, PDF and the settings page all find it.
 */
class LetterheadService
{
    const SETTING_KEY = 'letterhead_image';
    const CACHE_KEY = 'letterhead_file';

    public static function dir(): string
    {
        $dir = storage_path('app/settings');
        if (!is_dir($dir)) {
            @mkdir($dir, 0777, true);
        }
        return $dir;
    }

    /** Full path of the uploaded letterhead, or null when there is none. */
    public static function letterheadPath(): ?string
    {
        $file = Cache::remember(self::CACHE_KEY, 300, function () {
            try {
                return (string) DB::table('tbl_web_settings')->where('setting_key', self::SETTING_KEY)->value('setting_value');
            } catch (\Throwable $e) {
                return '';
            }
        });

        if ($file) {
            $path = self::dir() . DIRECTORY_SEPARATOR . basename($file);
            if (is_file($path)) {
                return $path;
            }
        }

        // The setting could not be read (database busy) - the file on disk is the truth
        $found = glob(self::dir() . DIRECTORY_SEPARATOR . 'letterhead.*') ?: [];
        return $found ? $found[0] : null;
    }

    /** Saves the uploaded image as the letterhead and returns its size. */
    public static function storeLetterhead(string $sourcePath, string $extension): array
    {
        [$width, $height] = @getimagesize($sourcePath) ?: [0, 0];
        if (!$width || !$height) {
            throw new \RuntimeException('That file is not a readable image.');
        }
        if ($height < $width) {
            throw new \RuntimeException('The letterhead must be a portrait A4 page (taller than it is wide).');
        }

        if (!function_exists('imagewebp')) {
            throw new \RuntimeException('This server cannot convert images (PHP gd/webp is not enabled).');
        }

        $image = @imagecreatefromstring(file_get_contents($sourcePath));
        if (!$image) {
            throw new \RuntimeException('That image format could not be read. Please use JPG, PNG, WebP, GIF or BMP.');
        }

        // A4 at 300 dpi is plenty for a letterhead; anything larger only makes the file heavy
        $maxWidth = 2480;
        if ($width > $maxWidth) {
            $resized = imagescale($image, $maxWidth);
            if ($resized) {
                imagedestroy($image);
                $image = $resized;
                $width = imagesx($image);
                $height = imagesy($image);
            }
        }

        // One file at a time - drop whatever was there before
        foreach (glob(self::dir() . DIRECTORY_SEPARATOR . 'letterhead.*') ?: [] as $old) {
            @unlink($old);
        }

        // Whatever came in, it is stored as WebP
        $fileName = 'letterhead.webp';
        $target = self::dir() . DIRECTORY_SEPARATOR . $fileName;
        $written = imagewebp($image, $target, 88);
        imagedestroy($image);

        if (!$written || !is_file($target)) {
            throw new \RuntimeException('Could not save the letterhead image.');
        }

        self::saveSetting($fileName);

        return [
            'file' => $fileName,
            'width' => $width,
            'height' => $height,
            'original_format' => strtolower($extension),
            'size_kb' => (int) ceil(filesize($target) / 1024),
        ];
    }

    public static function removeLetterhead(): void
    {
        foreach (glob(self::dir() . DIRECTORY_SEPARATOR . 'letterhead.*') ?: [] as $old) {
            @unlink($old);
        }
        self::saveSetting('');
    }

    /** Data URI of the letterhead, for the PDF background. Null when there is none. */
    public static function dataUri(): ?string
    {
        $path = self::letterheadPath();
        if (!$path) {
            return null;
        }
        $mime = mime_content_type($path) ?: 'image/jpeg';
        return 'data:' . $mime . ';base64,' . base64_encode(file_get_contents($path));
    }

    private static function saveSetting(string $fileName): void
    {
        try {
            DB::table('tbl_web_settings')->updateOrInsert(
                ['setting_key' => self::SETTING_KEY],
                [
                    'setting_value' => $fileName,
                    'setting_type' => 'text',
                    'setting_group' => 'report',
                    'setting_label' => 'Report letterhead image',
                    'updated_at' => now(),
                ]
            );
        } catch (\Throwable $e) {
            // settings table not reachable - the file is still on disk
        }
        Cache::forget(self::CACHE_KEY);
    }
}
