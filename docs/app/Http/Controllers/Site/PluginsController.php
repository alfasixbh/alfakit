<?php

namespace App\Http\Controllers\Site;

use App\Support\Site\Plugins;
use App\Support\Site\Repository;
use App\Support\Site\Seo;
use App\Support\Site\Showcase;
use Inertia\Inertia;
use Inertia\Response;

class PluginsController
{
    public function __construct(private readonly Plugins $plugins, private readonly Showcase $showcase) {}

    public function index(): Response
    {
        return Inertia::render('site/plugins/index', [
            'seo' => Seo::make('Plugins - AlfaKit', 'Packages that extend AlfaKit panels, with the renderers and AlfaKit versions each one supports.'),
            ...$this->plugins->all(),
            'renderers' => Plugins::RENDERERS,
            'showcases' => $this->showcase->slugs(),
            'bundles' => $this->showcase->bundles(),
        ]);
    }

    /**
     * A first-party plugin's showcase page: clips, the live demo, install and highlights.
     */
    public function show(string $slug): Response
    {
        abort_unless($this->showcase->has($slug), 404);

        $plugin = $this->showcase->page($slug);
        $poster = $plugin['clips']['react-light']['poster'] ?? null;

        return Inertia::render('site/plugins/show', [
            'seo' => Seo::make($plugin['name'].' - AlfaKit plugins', $plugin['description'], $poster),
            'plugin' => $plugin,
            'login' => ['email' => 'demo@alfakit.dev', 'password' => 'password'],
        ]);
    }

    public function submit(): Response
    {
        return Inertia::render('site/plugins/submit', [
            'seo' => Seo::make('Submit a plugin - AlfaKit', 'How to list your AlfaKit plugin in the directory and declare which AlfaKit versions it supports.'),
            'links' => [
                'pluginsJson' => Repository::blob('docs/content/plugins.json'),
                'edit' => Repository::GITHUB.'/edit/main/docs/content/plugins.json',
                'contact' => Repository::ALFA_SIX,
            ],
            'categories' => $this->plugins->all()['categories'],
        ]);
    }
}
