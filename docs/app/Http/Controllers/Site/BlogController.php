<?php

namespace App\Http\Controllers\Site;

use App\Support\Site\Blog;
use App\Support\Site\Seo;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;

class BlogController
{
    public function __construct(private readonly Blog $blog) {}

    public function index(): Response
    {
        return Inertia::render('site/blog/index', [
            'seo' => Seo::make('Blog - AlfaKit', 'News, release notes and guides from the AlfaKit team at Alfa Six.'),
            'posts' => $this->blog->posts(),
        ]);
    }

    public function show(string $slug): Response
    {
        $post = $this->blog->post($slug);

        return Inertia::render('site/blog/show', [
            'seo' => Seo::make($post['title'].' - AlfaKit blog', $post['description'], $post['cover'], 'article'),
            'post' => $post,
            'more' => array_values(array_filter($this->blog->posts(), fn (array $other): bool => $other['slug'] !== $slug)),
        ]);
    }

    public function rss(): HttpResponse
    {
        $items = '';

        foreach (array_slice($this->blog->posts(), 0, 20) as $post) {
            $url = url('/blog/'.$post['slug']);
            $items .= "    <item>\n"
                .'      <title>'.e($post['title'])."</title>\n"
                .'      <link>'.e($url)."</link>\n"
                .'      <guid isPermaLink="true">'.e($url)."</guid>\n"
                .'      <description>'.e($post['description'])."</description>\n"
                .'      <dc:creator>'.e($post['author'])."</dc:creator>\n"
                .'      <pubDate>'.date(DATE_RSS, (int) strtotime($post['date'].' 00:00:00 UTC'))."</pubDate>\n"
                ."    </item>\n";
        }

        $xml = '<?xml version="1.0" encoding="UTF-8"?>'."\n"
            .'<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">'."\n"
            ."  <channel>\n"
            ."    <title>AlfaKit blog</title>\n"
            .'    <link>'.e(url('/blog'))."</link>\n"
            .'    <atom:link href="'.e(url('/blog/rss.xml')).'" rel="self" type="application/rss+xml" />'."\n"
            ."    <description>News, release notes and guides from the AlfaKit team at Alfa Six.</description>\n"
            ."    <language>en</language>\n"
            .$items
            ."  </channel>\n"
            ."</rss>\n";

        return response($xml, 200, ['Content-Type' => 'application/rss+xml; charset=UTF-8']);
    }
}
