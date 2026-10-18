<?php

declare(strict_types=1);

use App\Models\Product;
use App\Models\Store;

it('redirects the root to the React storefront', function (): void {
    $this->get('/')->assertRedirect('/react');
});

it('renders the storefront home in every renderer', function (string $renderer): void {
    $store = Store::factory()->create();
    Product::factory()->featured()->count(2)->create(['store_id' => $store->id]);

    $response = $this->get("/{$renderer}")->assertOk();
    $page = $response->viewData('page');

    expect($page['component'])->toBe('Storefront/Home')
        ->and($page['props']['renderer'])->toBe($renderer)
        ->and($page['props']['featured'])->toHaveCount(2)
        ->and($page['props']['storefront']['renderers'])->toHaveCount(3);
})->with(['react', 'vue', 'svelte']);
