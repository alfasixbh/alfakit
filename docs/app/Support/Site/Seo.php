<?php

namespace App\Support\Site;

/**
 * Per-page head tags: title, description, canonical URL and social image. Controllers pass
 * the result as the `seo` prop; resources/views/app.blade.php renders it for crawlers and
 * resources/js/components/site/seo.tsx keeps it in sync on client-side visits.
 */
class Seo
{
    public const DEFAULT_IMAGE = '/brand/alfakit-social-card-alfasix.png';

    public const DEFAULT_DESCRIPTION = 'AlfaKit by Alfa Six. Your Laravel foundation. Your frontend choice. Build admin panels in PHP and render them with React, Vue or Svelte.';

    /**
     * @param  array<string, mixed>|null  $jsonLd  JSON-LD rendered in the first response (the home page)
     * @return array{title: string, description: string, canonical: string, image: string, type: string, jsonLd: array<string, mixed>|null}
     */
    public static function make(string $title, ?string $description = null, ?string $image = null, string $type = 'website', ?array $jsonLd = null): array
    {
        return [
            'title' => $title,
            'description' => $description ?: self::DEFAULT_DESCRIPTION,
            'canonical' => url()->current(),
            'image' => url($image ?? self::DEFAULT_IMAGE),
            'type' => $type,
            'jsonLd' => $jsonLd,
        ];
    }
}
