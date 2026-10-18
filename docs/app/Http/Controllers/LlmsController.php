<?php

namespace App\Http\Controllers;

use App\Support\Documentation;
use Illuminate\Http\Response;

/**
 * Machine-readable documentation for AI agents, following https://llmstxt.org:
 * `/llms.txt` (an index), `/llms-full.txt` (every page) and `/docs/{page}.md` (one page).
 */
class LlmsController
{
    public function __construct(private readonly Documentation $docs) {}

    public function index(): Response
    {
        $lines = [
            '# AlfaKit',
            '',
            '> AlfaKit by Alfa Six (`alfasix/alfakit`) is an admin panel builder for Laravel 13: define panels, resources, forms, tables, actions, infolists and widgets in PHP and render them with React, Vue or Svelte through Inertia and shadcn components. It supports many languages, right-to-left layouts, every currency and six themes.',
            '',
            'Key facts for agents: PHP namespace `AlfaSix\\Alfakit`; npm packages `@alfakit/core`, `@alfakit/react`, `@alfakit/vue`, `@alfakit/svelte`; code lives in `app/Alfakit` and `app/Providers/Alfakit`; generators are `php artisan make:alfakit-*`. All logic runs in PHP; renderers only display JSON schemas. Laravel Boost users get guidelines and skills automatically (`php artisan boost:install`); other agents can run `php artisan alfakit:ai` to write AGENTS.md, CLAUDE.md, Cursor rules or Copilot instructions.',
            '',
            '- [Full documentation in one file]('.url('/llms-full.txt').'): every page below, concatenated.',
            '',
        ];

        foreach ($this->docs->sidebar() as $section) {
            $lines[] = '## '.$section['label'];
            $lines[] = '';

            foreach ($section['items'] as $item) {
                $description = $this->docs->meta($item['slug'])['description'];
                $lines[] = '- ['.$item['title'].']('.url('/docs/'.$item['slug'].'.md').')'.($description ? ': '.$description : '');
            }

            $lines[] = '';
        }

        return $this->text(implode("\n", $lines));
    }

    public function full(): Response
    {
        $parts = ["# AlfaKit documentation\n\nSource: ".url('/docs')."\n"];

        foreach ($this->docs->sidebar() as $section) {
            foreach ($section['items'] as $item) {
                $parts[] = "---\n\n<!-- ".url('/docs/'.$item['slug'])." -->\n\n".$this->docs->markdown($item['slug']);
            }
        }

        return $this->text(implode("\n\n", $parts));
    }

    public function page(string $slug): Response
    {
        return $this->text($this->docs->markdown($slug), 'text/markdown');
    }

    private function text(string $content, string $type = 'text/plain'): Response
    {
        return response($content."\n", 200, [
            'Content-Type' => $type.'; charset=UTF-8',
            'Cache-Control' => 'public, max-age=3600',
            'X-Robots-Tag' => 'noindex',
        ]);
    }
}
