<?php

declare(strict_types=1);

use App\Demo\DemoPlugins;
use App\Http\Middleware\SetStorefrontLocale;
use Illuminate\Support\Arr;

/*
 * The demo is offered in the 13 AlfaKit locales (DemoPlugins::LOCALES). Every demo lang file
 * in lang/en must exist in each locale with exactly the same keys and the same :placeholders,
 * so a translation can never drop a value the code passes in. validation.php has no English
 * file (Laravel ships it), so the Arabic one is the reference for its keys.
 */

/** @return array<int, string> the :placeholders of a line, deduplicated and sorted */
function demoPlaceholders(mixed $line): array
{
    preg_match_all('/:[a-z_]+/i', is_string($line) ? $line : '', $matches);
    $found = array_values(array_unique($matches[0]));
    sort($found);

    return $found;
}

/** @return array<string, mixed> */
function demoLangFile(string $locale, string $file): array
{
    return Arr::dot(require lang_path("{$locale}/{$file}.php"));
}

dataset('demo lang files', fn (): array => array_map(
    fn (string $path): string => basename($path, '.php'),
    glob(dirname(__DIR__, 2).'/lang/en/*.php') ?: [],
));

it('has a folder for every demo locale', function (): void {
    foreach (DemoPlugins::LOCALES as $locale) {
        expect(is_dir(lang_path($locale)))->toBeTrue("Missing lang/{$locale}");
    }
});

it('translates a demo lang file into every locale with the same keys and placeholders', function (string $file): void {
    $english = demoLangFile('en', $file);

    foreach (DemoPlugins::LOCALES as $locale) {
        expect(file_exists(lang_path("{$locale}/{$file}.php")))->toBeTrue("Missing {$locale}/{$file}.php");

        $translated = demoLangFile($locale, $file);

        expect(array_values(array_diff(array_keys($english), array_keys($translated))))->toBe([], "Missing in {$locale}/{$file}.php")
            ->and(array_values(array_diff(array_keys($translated), array_keys($english))))->toBe([], "Extra in {$locale}/{$file}.php");

        foreach ($english as $key => $line) {
            expect(demoPlaceholders($translated[$key]))->toBe(demoPlaceholders($line), "Placeholders differ in {$locale}/{$file}.php: {$key}");
        }
    }
})->with('demo lang files');

it('translates the demo validation messages into every non-English locale', function (): void {
    $reference = demoLangFile('ar', 'validation');

    foreach (array_diff(DemoPlugins::LOCALES, ['en']) as $locale) {
        $translated = demoLangFile($locale, 'validation');

        expect(array_values(array_diff(array_keys($reference), array_keys($translated))))->toBe([], "Missing in {$locale}/validation.php")
            ->and(array_values(array_diff(array_keys($translated), array_keys($reference))))->toBe([], "Extra in {$locale}/validation.php");

        foreach ($reference as $key => $line) {
            expect(demoPlaceholders($translated[$key]))->toBe(demoPlaceholders($line), "Placeholders differ in {$locale}/validation.php: {$key}");
        }
    }
});

it('offers the same locales on the storefront as in the panels', function (): void {
    expect(SetStorefrontLocale::LOCALES)->toBe(DemoPlugins::LOCALES);
});
