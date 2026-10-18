<?php

declare(strict_types=1);

use AlfaSix\AlfakitAnalytics\Models\Site;
use AlfaSix\AlfakitCms\Models\Menu;
use AlfaSix\AlfakitCms\Models\Page;
use AlfaSix\AlfakitCms\Models\Section;
use AlfaSix\AlfakitCms\Models\Template;
use AlfaSix\AlfakitFeatureFlags\Pages\ManageFeature;
use AlfaSix\AlfakitForms\Models\Form;
use AlfaSix\AlfakitHelpdesk\Models\CannedReply;
use AlfaSix\AlfakitHelpdesk\Models\HelpdeskGroup;
use AlfaSix\AlfakitHelpdesk\Models\Ticket;
use AlfaSix\AlfakitInvoices\Models\Invoice;
use AlfaSix\AlfakitInvoices\Models\Tax;
use AlfaSix\AlfakitMailTemplates\Models\MailTemplate;
use App\Demo\SupplierApi;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Models\ReturnRequest;
use App\Models\Store;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\DemoSeeder;
use Illuminate\Routing\Route;
use Illuminate\Support\Facades\Route as Router;
use Spatie\Activitylog\Models\Activity;
use Spatie\Permission\Models\Role;

/**
 * Every GET page of every panel renders for the demo user with the seeded data. This is the
 * safety net for the public demo: a resource, page, cluster or relation manager that throws
 * fails here before anyone opens it in a browser.
 */
dataset('smoke renderers', ['react', 'vue', 'svelte']);

/** @return array{User, Store} */
function smokeSeed(): array
{
    DemoSeeder::$scale = 0.05;
    test()->seed(DatabaseSeeder::class);
    DemoSeeder::$scale = null;

    $user = User::query()->where('email', User::DEMO_EMAIL)->firstOrFail();
    $store = $user->stores()->orderBy('stores.id')->firstOrFail();

    return [$user, $store];
}

/** @return array<string, string> */
function smokeParameters(Store $store): array
{
    $product = Product::query()->where('store_id', $store->id)->firstOrFail();
    $order = Order::query()->where('store_id', $store->id)->firstOrFail();
    $customer = Customer::query()->where('store_id', $store->id)->firstOrFail();
    $staff = $store->users()->orderBy('users.id')->firstOrFail();

    return [
        'tenant' => $store->slug,
        'category' => (string) $product->category_id,
        'record' => (string) $product->getKey(),
        'order' => (string) $order->getKey(),
        'customer' => (string) $customer->getKey(),
        'staff' => (string) $staff->getKey(),
        'brand' => (string) $product->brand_id,
        'discount' => (string) ($store->discounts()->value('id') ?? 1),
        // Suppliers come from the fake supplier API (SupplierApiSeeder), not the database.
        'supplier' => SupplierApi::seededId($store->slug),
    ];
}

/**
 * Record keys of the plugin resources (route segment before `{record}`) in the store.
 *
 * @return array<string, int|string>
 */
function smokePluginRecords(string $tenant): array
{
    $store = Store::query()->where('slug', $tenant)->firstOrFail();
    $morph = ['tenant_type' => $store->getMorphClass(), 'tenant_id' => $store->getKey()];

    return array_filter([
        'returns' => ReturnRequest::query()->where('store_id', $store->id)->value('id'),
        'invoices' => Invoice::query()->where($morph)->where('status', 'draft')->value('id')
            ?? Invoice::query()->where($morph)->value('id'),
        'invoice-taxes' => Tax::query()->where($morph)->value('id'),
        'tickets' => Ticket::query()->where($morph)->value('id'),
        'groups' => HelpdeskGroup::query()->where($morph)->value('id'),
        'canned-replies' => CannedReply::query()->where($morph)->value('id'),
        'pages' => Page::query()->where('tenant_id', $store->id)->value('id'),
        'menus' => Menu::query()->where('tenant_id', $store->id)->value('id'),
        'sections' => Section::query()->where('tenant_id', $store->id)->value('id') ?? 'skip',
        'templates' => Template::query()->where('tenant_id', $store->id)->value('id') ?? 'skip',
        'forms' => Form::query()->where($morph)->value('id'),
        'analytics-sites' => Site::query()->where($morph)->value('id') ?? 'skip',
        'roles' => Role::query()->where('team_id', $store->id)->value('id'),
        'activity-log' => Activity::query()->where('properties->alfakit_tenant_id', $store->id)->value('id'),
        'feature-flags' => ManageFeature::encode('storefront-live-chat'),
        // Global, not per store.
        'mail-templates' => MailTemplate::query()->value('id') ?? 'skip',
    ], fn (mixed $key): bool => $key !== null);
}

/**
 * @return array<int, string> every GET page URL of the given panel with real record ids
 */
function smokeUrls(string $renderer, Store $store): array
{
    $parameters = smokeParameters($store);

    return collect(Router::getRoutes()->getRoutes())
        ->filter(fn (Route $route): bool => in_array('GET', $route->methods(), true)
            && str_starts_with($route->uri(), "{$renderer}/admin/{tenant}")
            && ! str_contains($route->uri(), '_alfakit')
            // Printable Blade views (POS receipts) are not Inertia pages; Apps/AppPagesTest covers them.
            && ! str_contains($route->uri(), '/receipts/')
            // Plugin endpoints that are not pages: signed downloads and the copilot's JSON.
            && ! preg_match('#/(_ai/|backups/download|files/(file|zip)$)#', $route->uri())
            // Webhooks are read-only in the public demo (WebhookEndpointPolicy): 403 by design.
            && ! preg_match('#/webhooks/(create|\{record\}/edit)$#', $route->uri()))
        ->map(function (Route $route) use ($parameters): string {
            $uri = $route->uri();

            // Record ids depend on the resource the route belongs to.
            foreach (smokePluginRecords($parameters['tenant']) as $prefix => $key) {
                if (str_contains($uri, "/{$prefix}/{")) {
                    return '/'.preg_replace_callback('/\{(\w+)\??\}/', fn (array $m): string => $m[1] === 'tenant' ? $parameters['tenant'] : (string) $key, $uri);
                }
            }

            $record = match (true) {
                str_contains($uri, '/orders/') => $parameters['order'],
                str_contains($uri, '/customers/') => $parameters['customer'],
                str_contains($uri, '/staff/') => $parameters['staff'],
                str_contains($uri, '/brands/') => $parameters['brand'],
                str_contains($uri, '/discounts/') => $parameters['discount'],
                str_contains($uri, '/categories/{record}') => $parameters['category'],
                str_contains($uri, '/suppliers/') => $parameters['supplier'],
                default => $parameters['record'],
            };

            return '/'.preg_replace_callback('/\{(\w+)\??\}/', fn (array $m): string => match ($m[1]) {
                'record' => $record,
                default => $parameters[$m[1]] ?? '1',
            }, $uri);
        })
        ->unique()
        ->sort()
        ->values()
        ->all();
}

it('renders every panel page for the demo user', function (string $renderer): void {
    [$user, $store] = smokeSeed();

    $failures = [];

    foreach (smokeUrls($renderer, $store) as $url) {
        $response = $this->actingAs($user)->get($url);

        // Records a store doesn't have (no reusable CMS sections in the seed).
        if (str_contains($url, '/skip')) {
            continue;
        }

        // A cluster's index (and the Ops item) redirects to its first page.
        if ((str_ends_with($url, '/reports') || str_ends_with($url, '/ops')) && $response->getStatusCode() === 302) {
            continue;
        }

        if ($response->getStatusCode() !== 200) {
            $failures[] = "{$url} → {$response->getStatusCode()}";
        } elseif (! str_contains((string) $response->headers->get('content-type'), 'text/html')) {
            // JSON documents (OpenAPI), signed downloads and file streams of the plugins.
            continue;
        } elseif (($response->viewData('page')['props']['alfakit']['id'] ?? null) !== $renderer) {
            $failures[] = "{$url} → rendered by the wrong panel";
        }
    }

    expect($failures)->toBe([]);
})->with('smoke renderers');

it('renders the storefront pages for every renderer', function (string $renderer): void {
    [, $store] = smokeSeed();
    $product = Product::query()->where('store_id', $store->id)->firstOrFail();

    foreach (["/{$renderer}", "/{$renderer}/contact", "/{$renderer}/track", "/{$renderer}/products/{$product->slug}"] as $url) {
        $this->get($url)->assertOk();
    }
})->with('smoke renderers');
