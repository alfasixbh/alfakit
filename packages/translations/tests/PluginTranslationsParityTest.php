<?php

declare(strict_types=1);

use AlfaSix\Alfakit\Localization\TranslationChecker;

/*
 * Every first-party plugin ships its strings in the same languages as AlfaKit (the packs in
 * packages/translations/lang plus English), each mirroring the plugin's English files: same
 * files, same keys, same :placeholders, no empty strings.
 */

$plugins = dirname(__DIR__, 2).'/plugins';
$locales = ['en', ...array_map('basename', glob(dirname(__DIR__).'/lang/*', GLOB_ONLYDIR) ?: [])];
$withStrings = array_values(array_filter(
    array_map('basename', glob($plugins.'/*', GLOB_ONLYDIR) ?: []),
    static fn (string $plugin): bool => is_dir("{$plugins}/{$plugin}/resources/lang/en"),
));

$load = static function (string $directory): array {
    $lines = [];

    foreach (glob($directory.'/*.php') ?: [] as $file) {
        foreach (TranslationChecker::flatten(require $file) as $key => $value) {
            $lines[basename($file, '.php').'.'.$key] = $value;
        }
    }

    ksort($lines);

    return $lines;
};

it('finds the plugins with strings', function () use ($withStrings): void {
    expect(count($withStrings))->toBeGreaterThanOrEqual(25)
        ->and($withStrings)->toContain('ai', 'api', 'billing', 'calendar', 'cms', 'comments', 'feature-flags', 'forms');
});

it('translates every English string of every plugin in every AlfaKit language', function (string $plugin) use ($plugins, $locales, $load): void {
    $directory = "{$plugins}/{$plugin}/resources/lang";
    $source = $load("{$directory}/en");

    expect($source)->not->toBeEmpty();

    foreach ($locales as $locale) {
        expect(is_dir("{$directory}/{$locale}"))->toBeTrue("{$plugin} has no {$locale} strings");

        $target = $load("{$directory}/{$locale}");

        expect(array_keys($target))->toEqual(array_keys($source), "{$plugin} {$locale} keys differ from English");

        foreach ($target as $key => $value) {
            expect(trim($value))->not->toBe('', "{$plugin} {$locale}: {$key} is empty");
            expect(TranslationChecker::placeholders($value))
                ->toEqual(TranslationChecker::placeholders($source[$key]), "{$plugin} {$locale}: placeholders differ in {$key}");
        }
    }
})->with($withStrings);
