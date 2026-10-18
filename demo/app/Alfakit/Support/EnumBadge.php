<?php

declare(strict_types=1);

namespace App\Alfakit\Support;

use AlfaSix\Alfakit\Infolists\Components\TextEntry;
use AlfaSix\Alfakit\Support\EnumState;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use UnitEnum;

/**
 * Badge columns and entries for the demo enums. AlfaKit reads the label, colour and icon of
 * enums implementing `HasLabel` / `HasColor` / `HasIcon` itself, so these are shorthands for
 * `->badge()->enum(Status::class)` (the enum hint also resolves raw backing values, e.g. a
 * JSON timeline step). New code can use the column or entry directly.
 */
final class EnumBadge
{
    /** @param  class-string<UnitEnum>  $enum */
    public static function column(string $name, string $enum): TextColumn
    {
        return TextColumn::make($name)->badge()->enum($enum);
    }

    /** @param  class-string<UnitEnum>  $enum */
    public static function entry(string $name, string $enum): TextEntry
    {
        return TextEntry::make($name)->badge()->enum($enum);
    }

    /**
     * @param  class-string<UnitEnum>  $enum
     */
    public static function resolve(mixed $state, string $enum): ?UnitEnum
    {
        return EnumState::resolve($state, $enum);
    }

    /**
     * `->colors([...])` and `->icons([...])` maps for ToggleButtons built from an enum.
     *
     * @deprecated `ToggleButtons::make()->options(Status::class)` takes colours and icons from the enum.
     *
     * @param  class-string<UnitEnum>  $enum
     * @return array{colors: array<string, string>, icons: array<string, string>}
     */
    public static function toggleMaps(string $enum): array
    {
        $colors = [];
        $icons = [];

        foreach ($enum::cases() as $case) {
            $key = (string) EnumState::key($case);
            $colors[$key] = (string) EnumState::color($case);
            $icons[$key] = (string) EnumState::icon($case);
        }

        return ['colors' => $colors, 'icons' => $icons];
    }
}
