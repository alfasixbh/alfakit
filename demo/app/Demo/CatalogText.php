<?php

declare(strict_types=1);

namespace App\Demo;

use Closure;

/**
 * Lazily translated labels for the catalog resources: every AlfaKit label accepts a Closure,
 * so the string is resolved in the user's language when the schema is serialised.
 */
final class CatalogText
{
    public static function t(string $key, array $replace = []): Closure
    {
        return static fn (): string => __("catalog.{$key}", $replace);
    }

    public static function field(string $key): Closure
    {
        return self::t("fields.{$key}");
    }

    public static function action(string $key): Closure
    {
        return self::t("actions.{$key}");
    }

    public static function section(string $key): Closure
    {
        return self::t("sections.{$key}");
    }

    public static function hint(string $key): Closure
    {
        return self::t("hints.{$key}");
    }
}
