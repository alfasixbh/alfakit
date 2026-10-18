<?php

declare(strict_types=1);

use App\Alfakit\Resources\DiscountResource;
use App\Alfakit\Resources\DiscountResource\Pages\CreateDiscount;
use App\Alfakit\Resources\DiscountResource\Pages\ListDiscounts;
use App\Enums\DiscountType;
use App\Enums\StaffRole;
use App\Models\Discount;

require_once __DIR__.'/SalesFixtures.php';

it('creates a percentage discount from the slider', function (): void {
    [$store] = salesStore();

    alfakit()->testPage(CreateDiscount::class, ['tenant' => $store], 'react')
        ->fillForm([
            'code' => 'summer15',
            'name' => 'Summer edit',
            'type' => DiscountType::Percentage->value,
            'value' => 15,
            'min_order_total' => 80,
            'starts_at' => now()->format('Y-m-d H:i'),
            'ends_at' => now()->addMonth()->format('Y-m-d H:i'),
            'is_active' => true,
        ])
        ->call('create')
        ->assertHasNoFormErrors();

    $discount = Discount::query()->where('code', 'SUMMER15')->firstOrFail();

    expect($discount->type)->toBe(DiscountType::Percentage)
        ->and((float) $discount->value)->toBe(15.0)
        ->and($discount->store_id)->toBe($store->id)
        ->and($discount->usage_limit)->toBeNull()
        ->and(DiscountResource::status($discount))->toBe('running');
});

it('stores a fixed amount and rejects an end before the start', function (): void {
    [$store] = salesStore();

    $page = alfakit()->testPage(CreateDiscount::class, ['tenant' => $store], 'vue')
        ->fillForm([
            'code' => 'GIFT25',
            'name' => 'Gift box credit',
            'type' => DiscountType::Fixed->value,
            'fixed_value' => 25,
            'starts_at' => now()->addWeek()->format('Y-m-d H:i'),
            'ends_at' => now()->format('Y-m-d H:i'),
        ])
        ->call('create')
        ->assertHasFormErrors(['ends_at']);

    $page->fillForm(['ends_at' => now()->addMonths(2)->format('Y-m-d H:i'), 'usage_limit' => 100])
        ->call('create')
        ->assertHasNoFormErrors();

    $discount = Discount::query()->where('code', 'GIFT25')->firstOrFail();

    expect((float) $discount->value)->toBe(25.0)
        ->and($discount->usage_limit)->toBe(100)
        ->and(DiscountResource::status($discount))->toBe('scheduled');
});

it('lists discounts with a computed status and limits writing to managers', function (): void {
    [$store] = salesStore(StaffRole::Staff);

    $expired = Discount::query()->create([
        'store_id' => $store->id,
        'code' => 'SPRING15',
        'name' => 'Spring edit',
        'type' => DiscountType::Percentage,
        'value' => 15,
        'used_count' => 3,
        'starts_at' => now()->subMonths(3),
        'ends_at' => now()->subMonth(),
        'is_active' => true,
    ]);

    alfakit()->testPage(ListDiscounts::class, ['tenant' => $store], 'svelte')
        ->assertOk()
        ->assertCanSeeTableRecords([$expired])
        ->assertTableColumnFormattedStateSet('status', __('sales.discounts.status.expired'), $expired)
        ->assertActionHidden('create');
});
