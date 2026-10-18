<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitTranslations;

use AlfaSix\Alfakit\Localization\Translations;
use Illuminate\Support\ServiceProvider;

/**
 * Adds every language in `lang/` to the `alfakit::` translation namespace. Apps still
 * override individual strings from `lang/vendor/alfakit/{locale}`.
 */
class AlfakitTranslationsServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        Translations::register(self::path());
    }

    public static function path(): string
    {
        return dirname(__DIR__).'/lang';
    }
}
