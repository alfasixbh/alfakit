<?php

declare(strict_types=1);

use App\Demo\Renderer;
use Illuminate\Http\Request;

it('swaps the renderer segment and keeps the rest of the URL', function (): void {
    $request = Request::create('/vue/admin/manama/products?search=oud&page=2');

    expect(Renderer::current($request))->toBe('vue')
        ->and(Renderer::url('react', $request))->toBe('/react/admin/manama/products?search=oud&page=2')
        ->and(Renderer::url('svelte', Request::create('/')))->toBe('/svelte')
        ->and(Renderer::url('svelte', Request::create('/demo/theme/soft')))->toBe('/svelte/demo/theme/soft');
});
