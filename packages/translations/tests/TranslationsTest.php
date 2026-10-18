<?php

declare(strict_types=1);

use AlfaSix\Alfakit\Localization\Locale;
use AlfaSix\Alfakit\Localization\TranslationChecker;

/*
 * Every language pack must mirror the English source exactly: same files, same keys,
 * same :placeholders, and no empty strings.
 */

$english = dirname(__DIR__, 2).'/alfakit/resources/lang/en';
$packs = dirname(__DIR__).'/lang';

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

$locales = array_map('basename', glob($packs.'/*', GLOB_ONLYDIR) ?: []);

it('ships at least one language', function () use ($locales): void {
    expect($locales)->not->toBeEmpty();
});

it('uses normalised locale codes', function (string $locale): void {
    expect(Locale::normalize($locale))->toBe($locale);
})->with($locales);

it('translates every English string', function (string $locale) use ($english, $packs, $load): void {
    $source = $load($english);
    $target = $load("{$packs}/{$locale}");

    expect(array_keys($target))->toEqual(array_keys($source), "{$locale} keys differ from English");

    foreach ($target as $key => $value) {
        expect(trim($value))->not->toBe('', "{$locale}: {$key} is empty");
    }
})->with($locales);

it('keeps every :placeholder', function (string $locale) use ($english, $packs, $load): void {
    $source = $load($english);
    $target = $load("{$packs}/{$locale}");

    foreach ($source as $key => $text) {
        if (! isset($target[$key])) {
            continue;
        }

        expect(TranslationChecker::placeholders($target[$key]))
            ->toEqual(TranslationChecker::placeholders($text), "{$locale}: placeholders differ in {$key}");
    }
})->with($locales);

it('has valid PHP files with strict types', function (string $locale) use ($packs): void {
    foreach (glob("{$packs}/{$locale}/*.php") ?: [] as $file) {
        expect(file_get_contents($file))->toContain('declare(strict_types=1);');
        expect(require $file)->toBeArray();
    }
})->with($locales);
