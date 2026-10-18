<?php

declare(strict_types=1);

use App\Demo\DemoPlugins;
use Illuminate\Support\Arr;

/*
 * The storefront (shop.php) and the Showcase group (showcase.php) are translated into every
 * language the demo offers; the keys of each file must match the English one exactly.
 */
it('translates every storefront and showcase string into every language', function (string $file): void {
    $english = array_keys(Arr::dot(require lang_path("en/{$file}.php")));

    $translations = glob(lang_path("*/{$file}.php")) ?: [];

    expect($translations)->toHaveCount(count(DemoPlugins::LOCALES), "Expected a {$file}.php for every demo locale");

    foreach ($translations as $path) {
        $locale = basename(dirname($path));
        $keys = array_keys(Arr::dot(require $path));

        expect(array_values(array_diff($english, $keys)))->toBe([], "Missing in {$locale}/{$file}.php")
            ->and(array_values(array_diff($keys, $english)))->toBe([], "Extra in {$locale}/{$file}.php");
    }
})->with(['shop', 'showcase']);
