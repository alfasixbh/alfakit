<?php

declare(strict_types=1);

use Illuminate\Support\Arr;

/*
 * Every first-party plugin ships its English language files in the same locales as the
 * AlfaKit core packs (packages/translations/lang). Each locale file must have exactly the
 * English key set and keep the English `:placeholders` in every value.
 */

/**
 * @return list<string>
 */
function pluginTranslationLocales(): array
{
    $locales = array_map('basename', glob(dirname(__DIR__).'/translations/lang/*', GLOB_ONLYDIR) ?: []);
    sort($locales);

    return $locales;
}

/**
 * @return array<string, array{string, string}>
 */
function pluginEnglishLanguageFiles(): array
{
    $files = [];

    foreach (glob(__DIR__.'/*/resources/lang/en/*.php') ?: [] as $path) {
        $plugin = basename(dirname($path, 4));
        $files[$plugin.'/'.basename($path)] = [$plugin, basename($path)];
    }

    ksort($files);

    return $files;
}

/**
 * @return list<string>
 */
function pluginTranslationPlaceholders(mixed $value): array
{
    if (! is_string($value)) {
        return [];
    }

    preg_match_all('/:([A-Za-z_][A-Za-z0-9_]*)/', $value, $matches);
    $placeholders = array_values(array_unique($matches[1]));
    sort($placeholders);

    return $placeholders;
}

it('finds the core locales and the plugin language files', function (): void {
    expect(pluginTranslationLocales())->toHaveCount(12)
        ->and(pluginEnglishLanguageFiles())->not->toBeEmpty();
});

it('translates every plugin language file into every core locale', function (string $plugin, string $file): void {
    $english = Arr::dot(require __DIR__."/{$plugin}/resources/lang/en/{$file}");

    foreach (pluginTranslationLocales() as $locale) {
        $path = __DIR__."/{$plugin}/resources/lang/{$locale}/{$file}";

        expect(is_file($path))->toBeTrue("Missing {$plugin}/resources/lang/{$locale}/{$file}");

        $translated = Arr::dot(require $path);

        expect(array_keys($translated))->toBe(array_keys($english), "Key mismatch in {$plugin}/{$locale}/{$file}");

        foreach ($english as $key => $value) {
            expect(pluginTranslationPlaceholders($translated[$key]))
                ->toBe(pluginTranslationPlaceholders($value), "Placeholder mismatch for {$key} in {$plugin}/{$locale}/{$file}");
        }
    }
})->with(pluginEnglishLanguageFiles());
