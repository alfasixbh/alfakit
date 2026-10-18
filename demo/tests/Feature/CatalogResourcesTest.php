<?php

declare(strict_types=1);

use App\Alfakit\Resources\BrandResource;
use App\Alfakit\Resources\ReviewResource;
use App\Alfakit\Resources\TagResource;
use App\Enums\ReviewStatus;
use App\Enums\StaffRole;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\Review;
use App\Models\Store;
use App\Models\Tag;
use App\Models\User;

dataset('catalog renderers', ['react', 'vue', 'svelte']);

/** @return array{User, Store, Store} an owner of the first store (staff of the second) and both stores */
function catalogOwner(): array
{
    $user = User::factory()->create();
    [$mine, $other] = Store::factory()->count(2)->create()->all();
    $user->stores()->attach($mine, ['role' => StaffRole::Owner->value]);
    $user->stores()->attach($other, ['role' => StaffRole::Staff->value]);

    return [$user, $mine, $other];
}

function catalogProduct(Store $store, Brand $brand, Category $category): Product
{
    return Product::factory()->for($store)->for($brand)->for($category)->create();
}

it('renders the catalog list pages on every renderer', function (string $renderer): void {
    [$user, $store] = catalogOwner();
    $brand = Brand::factory()->create();
    $category = Category::factory()->create();
    Tag::factory()->create();
    Review::factory()->for(catalogProduct($store, $brand, $category))->create(['status' => ReviewStatus::Pending]);

    foreach (['products', 'categories', 'brands', 'tags', 'reviews'] as $slug) {
        $response = $this->actingAs($user)->get("/{$renderer}/admin/{$store->slug}/{$slug}")->assertOk();

        expect($response->viewData('page')['props']['alfakit']['id'])->toBe($renderer);
    }
})->with('catalog renderers');

it('scopes reviews to the current store through the product', function (): void {
    [$user, $mine, $other] = catalogOwner();
    $brand = Brand::factory()->create();
    $category = Category::factory()->create();

    Review::factory()->count(2)->for(catalogProduct($mine, $brand, $category))->create(['status' => ReviewStatus::Pending]);
    Review::factory()->count(3)->for(catalogProduct($other, $brand, $category))->create(['status' => ReviewStatus::Pending]);

    $this->actingAs($user)->get("/react/admin/{$mine->slug}/reviews")->assertOk();

    // Outside a request the panel context is gone: restore it the way IdentifyTenant does.
    alfakit()->setCurrentPanel(alfakit()->getPanel('react'));
    alfakit()->setTenant($mine, isQuiet: true);

    expect(ReviewResource::getEloquentQuery()->count())->toBe(2)
        ->and(ReviewResource::getNavigationBadge())->toBe(2);
});

it('shows brands and tags to every store without tenant scoping', function (): void {
    [$user, $mine] = catalogOwner();
    Brand::factory()->count(3)->create();
    Tag::factory()->count(4)->create();

    $this->actingAs($user)->get("/react/admin/{$mine->slug}/brands")->assertOk();

    expect(BrandResource::getEloquentQuery()->count())->toBe(3)
        ->and(TagResource::getEloquentQuery()->count())->toBe(4);
});

it('names brand countries in the active language', function (): void {
    expect(BrandResource::countryName('fr'))->toBe('France');

    app()->setLocale('ar');

    expect(BrandResource::countryName('FR'))->toBe('فرنسا')
        ->and(BrandResource::countryName('ZZ'))->toBe('ZZ');
});
