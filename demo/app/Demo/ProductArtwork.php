<?php

declare(strict_types=1);

namespace App\Demo;

use App\Enums\Concentration;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Local SVG artwork for demo products: a bottle, candle or diffuser silhouette in the brand
 * palette with the product name. Written to the `demo` disk; never a remote URL.
 */
final class ProductArtwork
{
    public const DISK = 'demo';

    public const DIRECTORY = 'products';

    /** Brand palette plus a few calm tints, keyed so the same SKU always gets the same look. */
    private const PALETTES = [
        ['bg' => '#FFF4E4', 'glass' => '#073B78', 'liquid' => '#F47A22', 'text' => '#073B78'],
        ['bg' => '#073B78', 'glass' => '#FFF4E4', 'liquid' => '#F47A22', 'text' => '#FFF4E4'],
        ['bg' => '#F3E7D3', 'glass' => '#1E293B', 'liquid' => '#B45309', 'text' => '#1E293B'],
        ['bg' => '#E8EEF7', 'glass' => '#073B78', 'liquid' => '#5B8DEF', 'text' => '#073B78'],
        ['bg' => '#FBE3D0', 'glass' => '#7C2D12', 'liquid' => '#F47A22', 'text' => '#7C2D12'],
        ['bg' => '#E6F0EC', 'glass' => '#14532D', 'liquid' => '#86B49A', 'text' => '#14532D'],
    ];

    /**
     * Render and store the artwork, returning its path on the demo disk.
     */
    public static function store(string $sku, string $name, Concentration $concentration, ?string $brand = null): string
    {
        $path = self::DIRECTORY.'/'.Str::slug($sku).'.svg';

        Storage::disk(self::DISK)->put($path, self::render($sku, $name, $concentration, $brand));

        return $path;
    }

    public static function render(string $sku, string $name, Concentration $concentration, ?string $brand = null): string
    {
        $palette = self::PALETTES[crc32($sku) % count(self::PALETTES)];
        $shape = match ($concentration) {
            Concentration::Candle => self::candle($palette),
            Concentration::Diffuser => self::diffuser($palette),
            Concentration::BodyMist => self::tallBottle($palette),
            default => self::bottle($palette, $concentration === Concentration::Extrait || $concentration === Concentration::Parfum),
        };

        $label = e(Str::limit($name, 22, ''));
        $brandLabel = e(Str::upper((string) $brand));

        return <<<SVG
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="400" height="500" role="img" aria-label="{$label}">
  <rect width="400" height="500" rx="24" fill="{$palette['bg']}"/>
  <circle cx="200" cy="230" r="150" fill="{$palette['glass']}" opacity="0.06"/>
  {$shape}
  <text x="200" y="430" text-anchor="middle" font-family="Montserrat, Inter, sans-serif" font-weight="700" font-size="22" fill="{$palette['text']}">{$label}</text>
  <text x="200" y="458" text-anchor="middle" font-family="Inter, sans-serif" font-size="12" letter-spacing="3" fill="{$palette['text']}" opacity="0.7">{$brandLabel}</text>
</svg>
SVG;
    }

    /** @param array{bg: string, glass: string, liquid: string, text: string} $p */
    private static function bottle(array $p, bool $heavy): string
    {
        $cap = $heavy ? '<rect x="170" y="90" width="60" height="50" rx="8" fill="'.$p['glass'].'"/>' : '<rect x="180" y="95" width="40" height="45" rx="6" fill="'.$p['glass'].'"/>';

        return $cap.<<<SVG

  <rect x="188" y="135" width="24" height="22" fill="{$p['glass']}" opacity="0.8"/>
  <rect x="120" y="155" width="160" height="210" rx="22" fill="{$p['glass']}" opacity="0.18"/>
  <rect x="128" y="200" width="144" height="157" rx="18" fill="{$p['liquid']}" opacity="0.85"/>
  <rect x="120" y="155" width="160" height="210" rx="22" fill="none" stroke="{$p['glass']}" stroke-width="4"/>
  <rect x="140" y="178" width="18" height="150" rx="9" fill="#ffffff" opacity="0.35"/>
SVG;
    }

    /** @param array{bg: string, glass: string, liquid: string, text: string} $p */
    private static function tallBottle(array $p): string
    {
        return <<<SVG
<rect x="182" y="80" width="36" height="40" rx="6" fill="{$p['glass']}"/>
  <rect x="150" y="120" width="100" height="250" rx="40" fill="{$p['glass']}" opacity="0.18"/>
  <rect x="156" y="170" width="88" height="194" rx="36" fill="{$p['liquid']}" opacity="0.85"/>
  <rect x="150" y="120" width="100" height="250" rx="40" fill="none" stroke="{$p['glass']}" stroke-width="4"/>
  <rect x="166" y="140" width="14" height="190" rx="7" fill="#ffffff" opacity="0.35"/>
SVG;
    }

    /** @param array{bg: string, glass: string, liquid: string, text: string} $p */
    private static function candle(array $p): string
    {
        return <<<SVG
<path d="M200 120 C 188 140, 190 150, 200 162 C 210 150, 212 140, 200 120 Z" fill="{$p['liquid']}"/>
  <rect x="198" y="160" width="4" height="22" fill="{$p['glass']}"/>
  <rect x="130" y="180" width="140" height="190" rx="18" fill="{$p['glass']}" opacity="0.18"/>
  <rect x="130" y="180" width="140" height="190" rx="18" fill="none" stroke="{$p['glass']}" stroke-width="4"/>
  <ellipse cx="200" cy="182" rx="70" ry="14" fill="{$p['bg']}" stroke="{$p['glass']}" stroke-width="4"/>
  <rect x="146" y="204" width="16" height="140" rx="8" fill="#ffffff" opacity="0.35"/>
SVG;
    }

    /** @param array{bg: string, glass: string, liquid: string, text: string} $p */
    private static function diffuser(array $p): string
    {
        return <<<SVG
<g stroke="{$p['glass']}" stroke-width="4" stroke-linecap="round">
    <line x1="200" y1="230" x2="150" y2="90"/><line x1="200" y1="230" x2="200" y2="80"/><line x1="200" y1="230" x2="250" y2="95"/><line x1="200" y1="230" x2="170" y2="100"/><line x1="200" y1="230" x2="235" y2="85"/>
  </g>
  <path d="M160 230 L240 230 L270 300 L270 350 Q270 370 250 370 L150 370 Q130 370 130 350 L130 300 Z" fill="{$p['glass']}" opacity="0.18" stroke="{$p['glass']}" stroke-width="4"/>
  <path d="M136 310 L264 310 L264 350 Q264 364 250 364 L150 364 Q136 364 136 350 Z" fill="{$p['liquid']}" opacity="0.85"/>
SVG;
    }
}
