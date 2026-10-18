<?php

declare(strict_types=1);

namespace App\Demo;

use AlfaSix\Alfakit\Theming\Themes;

/**
 * Design overrides chosen on the Theming showcase page, kept in the session so the whole
 * panel (and the other two renderers) picks them up on the next request. Each dimension
 * is validated against AlfaKit's own enum values; anything unknown is ignored.
 */
final class Design
{
    public const SESSION_KEY = 'demo.design';

    /** @var array<string, array<int, string>> dimension => allowed values */
    public const DIMENSIONS = [
        'layout' => ['sidebar', 'topbar', 'rail'],
        'nav' => ['soft', 'pill', 'bar', 'underline'],
        'header' => ['plain', 'banner', 'band', 'compact'],
        'surfaces' => ['bordered', 'elevated', 'flat', 'ring'],
        'inputs' => ['outline', 'filled', 'underline'],
        'buttons' => ['rounded', 'pill', 'square'],
        'tables' => ['lined', 'striped', 'minimal'],
    ];

    public const DENSITIES = ['comfortable', 'compact'];

    /** The override for one design dimension, or null to follow the theme. */
    public static function value(string $dimension): ?string
    {
        $value = self::all()[$dimension] ?? null;

        return is_string($value) && in_array($value, self::DIMENSIONS[$dimension] ?? [], true) ? $value : null;
    }

    public static function density(): ?string
    {
        $value = self::all()['density'] ?? null;

        return is_string($value) && in_array($value, self::DENSITIES, true) ? $value : null;
    }

    /**
     * @return array<string, mixed>
     */
    public static function all(): array
    {
        $all = session(self::SESSION_KEY, []);

        return is_array($all) ? $all : [];
    }

    /**
     * Store a new set of overrides (empty strings and unknown values clear the dimension).
     *
     * @param  array<string, mixed>  $values
     */
    public static function store(array $values): void
    {
        $clean = [];

        foreach (self::DIMENSIONS as $dimension => $allowed) {
            $value = $values[$dimension] ?? null;

            if (is_string($value) && in_array($value, $allowed, true)) {
                $clean[$dimension] = $value;
            }
        }

        if (is_string($values['density'] ?? null) && in_array($values['density'], self::DENSITIES, true)) {
            $clean['density'] = $values['density'];
        }

        session([self::SESSION_KEY => $clean]);

        if (is_string($values['theme'] ?? null) && Themes::has($values['theme'])) {
            session([DemoPanel::SESSION_THEME => $values['theme']]);
        }

        if (array_key_exists('mobile', $values)) {
            session([DemoPanel::SESSION_MOBILE => (bool) $values['mobile']]);
        }
    }

    public static function reset(): void
    {
        session()->forget([self::SESSION_KEY, DemoPanel::SESSION_THEME, DemoPanel::SESSION_MOBILE]);
    }
}
