<?php

declare(strict_types=1);

use App\Alfakit\Resources\CustomerResource\Pages\CreateCustomer;
use App\Alfakit\Resources\CustomerResource\Pages\ListCustomers;
use App\Alfakit\Resources\CustomerResource\Pages\ManageCustomerAddresses;
use App\Alfakit\Resources\CustomerResource\Pages\ViewCustomer;
use App\Models\Address;
use App\Models\Customer;

require_once __DIR__.'/SalesFixtures.php';

it('lists customers with order aggregates in every renderer', function (string $renderer): void {
    [$store] = salesStore();
    $customer = salesCustomer($store);
    salesOrder($store, $customer, salesProduct($store, 100));

    alfakit()->testPage(ListCustomers::class, ['tenant' => $store], $renderer)
        ->assertOk()
        ->assertCanSeeTableRecords([$customer])
        ->assertTableColumnStateSet('orders_count', 1, $customer)
        ->assertTableColumnExists('orders_sum_total')
        ->searchTable('noor@example.com')
        ->assertCanSeeTableRecords([$customer]);
})->with(['react', 'vue', 'svelte']);

it('creates a customer with a default address from the form', function (): void {
    [$store] = salesStore();

    alfakit()->testPage(CreateCustomer::class, ['tenant' => $store], 'react')
        ->fillForm([
            'first_name' => 'Layla',
            'last_name' => 'Rahimi',
            'email' => 'layla@example.com',
            'locale' => 'en',
            'country' => 'AE',
            'defaultAddress' => [
                'recipient' => 'Layla Rahimi',
                'line1' => '4 Marina Walk',
                'city' => 'Dubai',
                'country' => 'AE',
            ],
        ])
        ->call('create')
        ->assertHasNoFormErrors();

    $customer = Customer::query()->where('email', 'layla@example.com')->firstOrFail();

    expect($customer->store_id)->toBe($store->id)
        ->and($customer->defaultAddress?->line1)->toBe('4 Marina Walk')
        ->and($customer->defaultAddress?->is_default)->toBeTrue();
});

it('renders the spend chart entry and the VIP toggle on the profile', function (): void {
    [$store] = salesStore();
    $customer = salesCustomer($store);
    $customer->update(['is_vip' => false]); // the factory makes some customers VIP at random
    salesOrder($store, $customer, salesProduct($store, 60));

    $page = alfakit()->testPage(ViewCustomer::class, ['record' => $customer, 'tenant' => $store], 'svelte')->assertOk();
    $content = json_encode($page->getProps('page.content'));

    expect($content)->toContain('demo-spend-chart')->toContain('"orders":1');

    $page->callAction('toggle_vip')->assertHasNoActionErrors()->assertNotified();

    expect($customer->refresh()->is_vip)->toBeTrue();
});

it('manages addresses on the nested page and keeps one default', function (): void {
    [$store] = salesStore();
    $customer = salesCustomer($store);

    $page = alfakit()->testPage(ManageCustomerAddresses::class, ['record' => $customer, 'tenant' => $store], 'vue')
        ->assertOk()
        ->callTableAction('create', null, [
            'label' => 'Office',
            'type' => 'billing',
            'recipient' => 'Noor Haddad',
            'line1' => '8 Harbour Towers',
            'city' => 'Manama',
            'country' => 'BH',
            'is_default' => false,
        ])
        ->assertHasNoActionErrors();

    $office = Address::query()->where('line1', '8 Harbour Towers')->firstOrFail();

    $page->callTableAction('make_default', $office)->assertHasNoActionErrors();

    expect($office->refresh()->is_default)->toBeTrue()
        ->and($customer->addresses()->where('is_default', true)->count())->toBe(1);
});
