<?php

declare(strict_types=1);

use Illuminate\Support\Arr;

it('translates every plugin integration string into English and Arabic', function (): void {
    $english = array_keys(Arr::dot(require lang_path('en/plugins.php')));
    $arabic = array_keys(Arr::dot(require lang_path('ar/plugins.php')));

    expect(array_values(array_diff($english, $arabic)))->toBe([], 'Missing in ar/plugins.php')
        ->and(array_values(array_diff($arabic, $english)))->toBe([], 'Extra in ar/plugins.php');
});
