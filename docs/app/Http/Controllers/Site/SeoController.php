<?php

namespace App\Http\Controllers\Site;

use App\Support\Documentation;
use App\Support\Site\Blog;
use App\Support\Site\Showcase;
use Illuminate\Http\Response;

/**
 * sitemap.xml and robots.txt.
 */
class SeoController
{
    /** Public pages of the website, besides the documentation and the blog posts. */
    public const PAGES = ['/', '/features', '/demo', '/plugins', '/plugins/submit', '/blog', '/changelog', '/contact', '/community', '/services', '/ai'];

    public function sitemap(Documentation $docs, Blog $blog, Showcase $showcase): Response
    {
        $urls = array_map(fn (string $path): array => ['loc' => url($path), 'lastmod' => null], self::PAGES);

        foreach ($showcase->slugs() as $slug) {
            $urls[] = ['loc' => url('/plugins/'.$slug), 'lastmod' => null];
        }

        foreach ($docs->sidebar() as $section) {
            foreach ($section['items'] as $item) {
                $urls[] = ['loc' => url('/docs/'.$item['slug']), 'lastmod' => null];
            }
        }

        foreach ($blog->posts() as $post) {
            $urls[] = ['loc' => url('/blog/'.$post['slug']), 'lastmod' => $post['date']];
        }

        $xml = '<?xml version="1.0" encoding="UTF-8"?>'."\n".'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'."\n";

        foreach ($urls as $url) {
            $xml .= '  <url><loc>'.e($url['loc']).'</loc>'.($url['lastmod'] ? '<lastmod>'.$url['lastmod'].'</lastmod>' : '')."</url>\n";
        }

        return response($xml.'</urlset>'."\n", 200, ['Content-Type' => 'application/xml; charset=UTF-8']);
    }

    public function robots(): Response
    {
        return response("User-agent: *\nAllow: /\n\nSitemap: ".url('/sitemap.xml')."\n", 200, ['Content-Type' => 'text/plain; charset=UTF-8']);
    }
}
