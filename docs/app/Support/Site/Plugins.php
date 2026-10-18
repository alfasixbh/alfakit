<?php

namespace App\Support\Site;

use Illuminate\Support\Facades\File;

/**
 * The plugin directory, read from content/plugins.json. Entries are added by pull request;
 * the shape is checked by tests/Feature/Site/PluginsTest.php.
 */
class Plugins
{
    public const RENDERERS = ['react', 'vue', 'svelte'];

    public function __construct(protected string $path) {}

    /**
     * @return array{categories: array<string, string>, plugins: list<array<string, mixed>>}
     */
    public function all(): array
    {
        $data = json_decode(File::get($this->path), true, flags: JSON_THROW_ON_ERROR);

        $plugins = $data['plugins'] ?? [];
        usort($plugins, fn (array $a, array $b): int => [! ($a['firstParty'] ?? false), $a['name']] <=> [! ($b['firstParty'] ?? false), $b['name']]);

        return ['categories' => $data['categories'] ?? [], 'plugins' => $plugins];
    }

    /**
     * Whether a docs page (`plugins/cms`) documents a first-party plugin of the directory.
     */
    public function isFirstPartyDocsPage(string $slug): bool
    {
        foreach ($this->all()['plugins'] as $plugin) {
            if (($plugin['firstParty'] ?? false) && ($plugin['links']['docs'] ?? null) === '/docs/'.$slug) {
                return true;
            }
        }

        return false;
    }
}
