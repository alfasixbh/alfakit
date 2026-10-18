<?php

declare(strict_types=1);

use Illuminate\Support\Arr;

it('translates every app page string into every language', function (): void {
    $english = array_keys(Arr::dot(require lang_path('en/apps.php')));

    foreach (glob(lang_path('*/apps.php')) ?: [] as $file) {
        $locale = basename(dirname($file));
        $keys = array_keys(Arr::dot(require $file));

        expect(array_diff($english, $keys))->toBe([], "Missing in {$locale}")
            ->and(array_diff($keys, $english))->toBe([], "Extra in {$locale}");
    }
});
