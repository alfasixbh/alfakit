<?php

namespace App\Http\Controllers;

use App\Support\Site\Seo;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The landing page for AI coding agents: Laravel Boost, `alfakit:ai` and the llms.txt files.
 */
class AiController extends Controller
{
    public function __invoke(): Response
    {
        $skills = [];

        foreach (glob(base_path('vendor/alfasix/alfakit/resources/boost/skills/*/SKILL.md')) ?: [] as $file) {
            preg_match('/^description:\s*(.+)$/m', (string) file_get_contents($file), $description);

            $skills[] = ['name' => basename(dirname($file)), 'description' => trim($description[1] ?? '')];
        }

        return Inertia::render('ai', [
            'seo' => Seo::make(
                'AlfaKit for AI coding agents',
                'Laravel Boost guidelines and skills, php artisan alfakit:ai for other agents, and llms.txt documentation for machines.',
            ),
            'skills' => $skills,
            'urls' => [
                'llms' => url('/llms.txt'),
                'full' => url('/llms-full.txt'),
                'page' => url('/docs/getting-started/quick-start.md'),
            ],
        ]);
    }
}
