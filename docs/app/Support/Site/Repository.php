<?php

namespace App\Support\Site;

use Illuminate\Support\Facades\File;

/**
 * Files from the monorepo root (CHANGELOG.md, SECURITY.md, …) and the project's links.
 * The docs app lives in docs/, so the root is its parent directory; ALFAKIT_REPOSITORY_PATH
 * overrides it when the site is deployed on its own.
 */
class Repository
{
    public const GITHUB = 'https://github.com/alfasixbh/alfakit';

    public const ALFA_SIX = 'https://alfasixbh.com';

    public static function path(string $file): string
    {
        $root = (string) (config('docs.repository_path') ?: dirname(base_path()));

        return rtrim($root, '/').'/'.$file;
    }

    public static function read(string $file): ?string
    {
        $path = self::path($file);

        return File::exists($path) ? File::get($path) : null;
    }

    public static function blob(string $file): string
    {
        return self::GITHUB.'/blob/main/'.$file;
    }
}
