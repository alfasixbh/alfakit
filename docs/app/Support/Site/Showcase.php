<?php

namespace App\Support\Site;

use AlfaSix\Alfakit\Commands\Support\PluginBundles;
use App\Support\Documentation;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

/**
 * The showcase of the first-party plugins: each plugin's manifest (`extra.alfakit.showcase`
 * in packages/plugins/<slug>/composer.json, also read by `alfakit:add --list <slug>`), its
 * entry of the directory, the recorded clips in public/showcase/<slug>, the live demo links
 * and a short code snippet taken from its docs page.
 */
class Showcase
{
    public const RENDERERS = ['react', 'vue', 'svelte'];

    public const THEMES = ['light', 'dark'];

    public function __construct(protected Plugins $plugins, protected Documentation $docs) {}

    /**
     * Slugs of the first-party plugins that have a showcase page.
     *
     * @return list<string>
     */
    public function slugs(): array
    {
        return array_keys($this->entries());
    }

    public function has(string $slug): bool
    {
        return isset($this->entries()[$slug]);
    }

    /**
     * Everything the plugin page renders.
     *
     * @return array<string, mixed>
     */
    public function page(string $slug): array
    {
        $entries = $this->entries();
        abort_unless(isset($entries[$slug]), 404);

        ['plugin' => $plugin, 'showcase' => $showcase] = $entries[$slug];

        return [
            'slug' => $slug,
            'name' => $plugin['name'],
            'package' => $plugin['package'],
            'description' => $plugin['description'],
            'renderers' => $plugin['renderers'],
            'docsUrl' => $plugin['links']['docs'],
            'repositoryUrl' => $plugin['links']['repository'] ?? null,
            'install' => 'php artisan alfakit:add '.$slug,
            'highlights' => $showcase['highlights'],
            'tour' => $showcase['tour'],
            'demo' => $this->demoLinks($showcase['demoPath']),
            'clips' => $this->clips($slug, $showcase['clips']),
            'snippet' => $this->snippet($slug),
            'worksWith' => array_values(array_filter(array_map(fn (string $other): ?array => isset($entries[$other]) ? [
                'slug' => $other,
                'name' => $entries[$other]['plugin']['name'],
                'description' => Str::limit((string) $entries[$other]['plugin']['description'], 140),
            ] : null, $showcase['worksWith']))),
            'bundles' => array_values(array_map(
                fn (array $bundle): string => $bundle['label'],
                array_filter($this->bundles(), fn (array $bundle): bool => in_array($slug, $bundle['plugins'], true)),
            )),
        ];
    }

    /**
     * The plugin bundles of `alfakit:setup --bundle=…`, with the names of their plugins.
     *
     * @return list<array{name: string, label: string, description: string, command: string, plugins: list<string>, pluginNames: list<string>}>
     */
    public function bundles(): array
    {
        $entries = $this->entries();
        $bundles = [];

        foreach (PluginBundles::BUNDLES as $name => $bundle) {
            $plugins = array_keys($bundle['plugins']);

            $bundles[] = [
                'name' => $name,
                'label' => $bundle['label'],
                'description' => $bundle['description'],
                'command' => 'php artisan alfakit:setup --bundle='.$name,
                'plugins' => $plugins,
                'pluginNames' => array_map(fn (string $slug): string => $entries[$slug]['plugin']['name'] ?? Str::headline($slug), $plugins),
            ];
        }

        return $bundles;
    }

    /**
     * `{base}/{renderer}/admin/{tenant}/{demoPath}` for each renderer.
     *
     * @return array<string, string>
     */
    public function demoLinks(string $demoPath): array
    {
        $tenant = (string) config('docs.demo_tenant', 'manama');
        $links = [];

        foreach (self::RENDERERS as $renderer) {
            $links[$renderer] = Documentation::demoUrl()."/{$renderer}/admin/{$tenant}/".ltrim($demoPath, '/');
        }

        return $links;
    }

    /**
     * The recorded clips that exist on disk, as `react-light => {video, poster}`.
     *
     * @param  list<string>  $variants
     * @return array<string, array{video: string, poster: string|null}>
     */
    protected function clips(string $slug, array $variants): array
    {
        $clips = [];

        foreach ($variants as $variant) {
            if (! preg_match('/^[a-z]+-[a-z]+$/', $variant)) {
                continue;
            }

            $video = "showcase/{$slug}/{$variant}.webm";

            if (File::exists(public_path($video))) {
                $poster = "showcase/{$slug}/{$variant}.png";
                $clips[$variant] = ['video' => '/'.$video, 'poster' => File::exists(public_path($poster)) ? '/'.$poster : null];
            }
        }

        return $clips;
    }

    /**
     * The first PHP block of the plugin's docs page that registers it (`…Plugin::make()`).
     */
    protected function snippet(string $slug): ?string
    {
        if (! $this->docs->exists('plugins/'.$slug)) {
            return null;
        }

        preg_match_all('/```php\R(.*?)```/s', $this->docs->markdown('plugins/'.$slug), $blocks);

        foreach ($blocks[1] as $block) {
            if (str_contains($block, 'Plugin::make()')) {
                return rtrim($block);
            }
        }

        return isset($blocks[1][0]) ? rtrim($blocks[1][0]) : null;
    }

    /**
     * @return array<string, array{plugin: array<string, mixed>, showcase: array{demoPath: string, tour: list<string>, clips: list<string>, worksWith: list<string>, highlights: list<string>}}>
     */
    protected function entries(): array
    {
        $entries = [];

        foreach ($this->plugins->all()['plugins'] as $plugin) {
            $docs = (string) ($plugin['links']['docs'] ?? '');

            if (! ($plugin['firstParty'] ?? false) || ! str_starts_with($docs, '/docs/plugins/')) {
                continue;
            }

            $slug = Str::after($docs, '/docs/plugins/');
            $showcase = $this->manifest($slug);

            if ($showcase !== null) {
                $entries[$slug] = ['plugin' => $plugin, 'showcase' => $showcase];
            }
        }

        return $entries;
    }

    /**
     * @return array{demoPath: string, tour: list<string>, clips: list<string>, worksWith: list<string>, highlights: list<string>}|null
     */
    public function manifest(string $slug): ?array
    {
        if (! preg_match('/^[a-z0-9-]+$/', $slug)) {
            return null;
        }

        $composer = Repository::read("packages/plugins/{$slug}/composer.json");
        $data = $composer === null ? null : json_decode($composer, true);
        $showcase = is_array($data) ? ($data['extra']['alfakit']['showcase'] ?? null) : null;

        if (! is_array($showcase) || ! is_string($showcase['demoPath'] ?? null)) {
            return null;
        }

        $list = fn (mixed $value): array => array_values(array_filter(is_array($value) ? $value : [], 'is_string'));

        return [
            'demoPath' => trim($showcase['demoPath'], '/'),
            'tour' => $list($showcase['tour'] ?? []),
            'clips' => $list($showcase['clips'] ?? []),
            'worksWith' => $list($showcase['worksWith'] ?? []),
            'highlights' => $list($showcase['highlights'] ?? []),
        ];
    }
}
