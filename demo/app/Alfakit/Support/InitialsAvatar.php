<?php

declare(strict_types=1);

namespace App\Alfakit\Support;

/**
 * Avatar fallback for customers without a photo: a brand-coloured circle with the initials,
 * generated locally as an SVG data URL (no remote avatar services in the demo).
 */
final class InitialsAvatar
{
    /** @var array<int, string> Brand palette: navy, orange and a few calm companions. */
    private const PALETTE = ['#073B78', '#F47A22', '#0E6E8C', '#8B5E3C', '#2F6B4F', '#6D4C9F'];

    public static function url(string $initials, string $seed = '', ?string $color = null): string
    {
        $initials = mb_strtoupper(mb_substr(trim($initials) ?: '?', 0, 2));
        $color = $color !== null && preg_match('/^#[0-9a-f]{6}$/i', $color) === 1
            ? $color
            : self::PALETTE[abs(crc32($seed ?: $initials)) % count(self::PALETTE)];
        $text = htmlspecialchars($initials, ENT_QUOTES | ENT_XML1, 'UTF-8');

        $svg = <<<SVG
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><circle cx="32" cy="32" r="32" fill="{$color}"/><text x="32" y="32" dy=".36em" text-anchor="middle" font-family="Montserrat, Inter, Arial, sans-serif" font-size="26" font-weight="600" fill="#FFF4E4">{$text}</text></svg>
SVG;

        return 'data:image/svg+xml;utf8,'.rawurlencode($svg);
    }
}
