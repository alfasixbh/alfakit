<?php

declare(strict_types=1);

namespace App\Demo;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Local SVG monogram for a brand (initials on a brand-palette disc), stored on the demo disk
 * like the product artwork. Never a remote URL.
 */
final class BrandArtwork
{
    public const DISK = 'demo';

    public const DIRECTORY = 'brands';

    private const PALETTES = [
        ['bg' => '#073B78', 'fg' => '#FFF4E4'],
        ['bg' => '#F47A22', 'fg' => '#FFFFFF'],
        ['bg' => '#FFF4E4', 'fg' => '#073B78'],
        ['bg' => '#1E293B', 'fg' => '#F3E7D3'],
        ['bg' => '#14532D', 'fg' => '#E6F0EC'],
    ];

    public static function store(string $slug, string $name): string
    {
        $path = self::DIRECTORY.'/'.Str::slug($slug).'.svg';

        Storage::disk(self::DISK)->put($path, self::render($slug, $name));

        return $path;
    }

    public static function render(string $slug, string $name): string
    {
        $palette = self::PALETTES[crc32($slug) % count(self::PALETTES)];
        $initials = e(Str::upper(collect(preg_split('/[\s&]+/', $name) ?: [])
            ->filter()
            ->take(2)
            ->map(static fn (string $word): string => Str::substr($word, 0, 1))
            ->implode('')));
        $label = e($name);

        return <<<SVG
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240" role="img" aria-label="{$label}">
  <rect width="240" height="240" rx="120" fill="{$palette['bg']}"/>
  <circle cx="120" cy="120" r="104" fill="none" stroke="{$palette['fg']}" stroke-opacity="0.25" stroke-width="2"/>
  <text x="120" y="138" text-anchor="middle" font-family="Montserrat, Inter, sans-serif" font-size="72" font-weight="700" letter-spacing="2" fill="{$palette['fg']}">{$initials}</text>
</svg>
SVG;
    }
}
