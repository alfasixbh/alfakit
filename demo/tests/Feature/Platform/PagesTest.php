<?php

declare(strict_types=1);

use AlfaSix\Alfakit\Notifications\Notification;
use App\Enums\StaffRole;
use App\Models\Setting;
use App\Models\Store;
use App\Models\User;

/**
 * @return array{0: User, 1: Store}
 */
function platformManager(): array
{
    $manager = User::factory()->create();
    $store = Store::factory()->create();
    $manager->stores()->attach($store, ['role' => StaffRole::Manager->value]);

    return [$manager, $store];
}

it('renders the reports cluster pages', function (string $path): void {
    [$manager, $store] = platformManager();

    $response = $this->actingAs($manager)->get("/react/admin/{$store->slug}/{$path}")->assertOk();

    expect(json_encode($response->viewData('page')['props'], JSON_THROW_ON_ERROR))->toContain('Export');
})->with(['reports/sales', 'reports/inventory', 'reports/customers']);

it('manages the store settings as a singular record', function (): void {
    [$manager, $store] = platformManager();

    $page = $this->actingAs($manager)->get("/react/admin/{$store->slug}/settings")->assertOk();
    $token = $page->viewData('page')['props']['page']['token'];

    expect(Setting::query()->where('store_id', $store->id)->exists())->toBeFalse();

    $this->postJson("/react/admin/{$store->slug}/_alfakit/actions", [
        'token' => $token,
        'action' => 'save',
        'data' => [
            'store' => ['name' => $store->name, 'tagline' => 'Flagship boutique.', 'currency' => 'USD', 'timezone' => 'Asia/Bahrain'],
            'order_prefix' => 'MA',
            'tax_rate' => 10,
            'free_shipping_threshold' => 150,
            'low_stock_threshold' => 4,
            'notify_on_new_order' => true,
            'reviews_require_approval' => false,
            'welcome_message' => ['en' => 'Welcome to Maison Alfa.', 'ar' => 'مرحباً بكم في ميزون ألفا.'],
            'support_email' => 'care@maison-alfa.test',
        ],
    ])->assertRedirect();

    $setting = Setting::query()->where('store_id', $store->id)->firstOrFail();

    expect($setting->low_stock_threshold)->toBe(4)
        ->and($setting->reviews_require_approval)->toBeFalse()
        ->and($setting->welcome_message['ar'] ?? null)->toBe('مرحباً بكم في ميزون ألفا.');
});

it('lists, marks and clears the signed-in user\'s notifications', function (): void {
    [$manager, $store] = platformManager();

    Notification::make()->title('Payment captured')->success()->tenant($store)->sendToDatabase($manager);
    Notification::make()->title('Everywhere')->info()->forAllTenants()->sendToDatabase($manager);

    $page = $this->actingAs($manager)->get("/react/admin/{$store->slug}/notifications")->assertOk();
    $json = json_encode($page->viewData('page')['props'], JSON_THROW_ON_ERROR);

    expect($json)->toContain('Payment captured')->toContain('Everywhere')->toContain('Mark all as read');

    $token = $page->viewData('page')['props']['page']['token'];

    $this->postJson("/react/admin/{$store->slug}/_alfakit/actions", ['token' => $token, 'action' => 'markAllRead', 'data' => []])->assertSuccessful();

    expect($manager->unreadNotifications()->count())->toBe(0);

    $this->postJson("/react/admin/{$store->slug}/_alfakit/actions", ['token' => $token, 'action' => 'clearRead', 'data' => []])->assertSuccessful();

    expect($manager->notifications()->count())->toBe(0);
});

it('renders the platform showcase in English and Arabic', function (): void {
    [$manager, $store] = platformManager();

    $english = $this->actingAs($manager)->get("/react/admin/{$store->slug}/showcase-platform")->assertOk();

    expect(json_encode($english->viewData('page')['props'], JSON_THROW_ON_ERROR))
        ->toContain('Layout per role')
        ->toContain('Icons::register');

    $manager->update(['locale' => 'ar']);

    $arabic = $this->actingAs($manager)->get("/react/admin/{$store->slug}/showcase-platform")->assertOk();
    $props = $arabic->viewData('page')['props'];

    expect($props['alfakit']['localization']['direction'])->toBe('rtl')
        ->and(json_encode($props, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE))->toContain('تخطيط حسب الدور');
});
