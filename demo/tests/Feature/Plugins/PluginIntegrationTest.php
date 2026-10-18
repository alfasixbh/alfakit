<?php

declare(strict_types=1);

use AlfaSix\AlfakitCalendar\Widgets\CalendarWidget;
use AlfaSix\AlfakitHelpdesk\Models\Ticket;
use AlfaSix\AlfakitInvoices\Models\Invoice;
use AlfaSix\AlfakitWebhooks\Models\WebhookEndpoint;
use AlfaSix\AlfakitWorkflows\Support\Approvals;
use App\Alfakit\Widgets\Plugins\PromotionsCalendarWidget;
use App\Demo\Access;
use App\Models\Discount;
use App\Models\ReturnRequest;
use App\Models\Store;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\DemoPluginsSeeder;
use Database\Seeders\DemoSeeder;
use Illuminate\Support\Facades\DB;

beforeEach(function (): void {
    DemoSeeder::$scale = 0.05;
    $this->seed(DatabaseSeeder::class);
    DemoSeeder::$scale = null;

    $this->demo = User::query()->where('email', User::DEMO_EMAIL)->firstOrFail();
    $this->store = Store::query()->where('slug', 'manama')->firstOrFail();
});

function pluginCounts(): array
{
    return collect(['roles', 'return_requests', 'alfakit_invoices', 'helpdesk_tickets', 'alfakit_cms_pages', 'alfakit_forms', 'alfakit_webhook_endpoints', 'alfakit_api_tokens', 'alfakit_comments', 'activity_log'])
        ->mapWithKeys(fn (string $table): array => [$table => DB::table($table)->count()])
        ->all();
}

it('makes the demo account the owner of every store and seeds the four roles', function (): void {
    foreach (Store::query()->get() as $store) {
        setPermissionsTeamId($store->id);
        $this->demo->unsetRelation('roles');

        expect($this->demo->hasRole(Access::OWNER))->toBeTrue()
            ->and(DB::table('roles')->where('team_id', $store->id)->pluck('name')->sort()->values()->all())
            ->toBe(['manager', 'owner', 'support_agent', 'viewer']);
    }
});

it('seeds every plugin per store and can run again without duplicates', function (): void {
    $before = pluginCounts();

    expect($before['return_requests'])->toBeGreaterThan(0)
        ->and($before['alfakit_invoices'])->toBeGreaterThan(0)
        ->and($before['helpdesk_tickets'])->toBeGreaterThan(0)
        ->and($before['alfakit_cms_pages'])->toBeGreaterThan(0);

    DemoSeeder::$scale = 0.05;
    $this->seed(DemoPluginsSeeder::class);
    DemoSeeder::$scale = null;

    expect(pluginCounts())->toBe($before);
});

it('lets the owner approve a return from the approvals inbox', function (): void {
    alfakit()->setCurrentPanel(alfakit()->getPanel('react'));
    alfakit()->setTenant($this->store);
    setPermissionsTeamId($this->store->id);

    $return = ReturnRequest::query()->where('store_id', $this->store->id)->where('state', 'awaiting_approval')->firstOrFail();
    $approval = Approvals::assignmentFor($return->getPendingApprovalRequest(), $this->demo);

    expect($approval)->not->toBeNull();

    Approvals::approve($approval, $this->demo, 'Approved in a test.');

    expect($return->refresh()->state)->toBe('approved');
});

it('issues an invoice for an order from its lines', function (): void {
    $invoices = Invoice::query()->where('tenant_type', $this->store->getMorphClass())->where('tenant_id', $this->store->id)->get();

    expect($invoices)->not->toBeEmpty()
        ->and($invoices->first()->currency)->toBe('USD')
        ->and($invoices->first()->total)->toBeGreaterThan(0);
});

it('opens public tickets in the storefront store', function (): void {
    expect(Ticket::query()->where('tenant_id', $this->store->id)->count())->toBeGreaterThan(0);
});

it('keeps webhooks read-only and never delivering', function (): void {
    $endpoint = WebhookEndpoint::query()->firstOrFail();

    expect($endpoint->is_enabled)->toBeFalse()
        ->and($endpoint->url)->toStartWith('https://example.com/')
        ->and(config('queue.connections.demo-null.driver'))->toBe('null');

    $this->actingAs($this->demo)->get('/react/admin/manama/webhooks')->assertOk();
    $this->actingAs($this->demo)->get('/react/admin/manama/webhooks/create')->assertForbidden();
});

it('keeps Ops read-only without logs or maintenance mode', function (): void {
    $this->actingAs($this->demo)->get('/react/admin/manama/ops/overview')->assertOk();
    $this->actingAs($this->demo)->get('/react/admin/manama/ops/logs')->assertNotFound();
    $this->actingAs($this->demo)->get('/react/admin/manama/ops/maintenance')->assertNotFound();
});

it('lets managers drag a promotion on the calendar and refuses viewers', function (): void {
    $discount = Discount::query()->where('store_id', $this->store->id)->where('code', 'CAL-AUTUMN')->firstOrFail();
    $component = 'widget:'.PromotionsCalendarWidget::make()->getId();
    $drop = fn (User $user, int $days) => $this->actingAs($user)->postJson('/react/admin/manama/_alfakit/actions', [
        'token' => $this->actingAs($user)->get('/react/admin/manama/calendar')->viewData('page')['props']['page']['token'],
        'component' => $component,
        'action' => CalendarWidget::EVENT_DROP_ACTION,
        'record' => $discount->id,
        'arguments' => ['calendar' => [
            'start' => $discount->starts_at->copy()->addDays($days)->toIso8601String(),
            'end' => $discount->ends_at->copy()->addDays($days)->toIso8601String(),
            'allDay' => false,
            'oldStart' => $discount->starts_at->toIso8601String(),
            'oldEnd' => $discount->ends_at->toIso8601String(),
        ]],
    ]);

    $start = $discount->starts_at->copy();
    $drop($this->demo, 1)->assertOk();
    expect($discount->refresh()->starts_at->toDateString())->toBe($start->copy()->addDay()->toDateString());

    $viewer = $this->store->users()->wherePivot('role', 'staff')->firstOrFail();
    $response = $drop($viewer, 3);
    expect($discount->refresh()->starts_at->toDateString())->toBe($start->copy()->addDay()->toDateString())
        ->and($response->status())->toBeIn([200, 403]);
});

it('lists the billing plans and never starts a real checkout', function (): void {
    $this->actingAs($this->demo)->get('/react/admin/manama/billing/plans')->assertOk();

    $page = $this->actingAs($this->demo)->get('/react/admin/manama/billing?plan=maison')->assertOk()->viewData('page');

    expect(json_encode($page['props'], JSON_UNESCAPED_UNICODE))->toContain(__('plugins.billing.checkout_disabled'));
});
