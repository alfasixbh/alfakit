<?php

declare(strict_types=1);

use App\Demo\SupplierApi;
use App\Enums\StaffRole;
use App\Http\Middleware\HandleInertiaRequests;
use App\Models\Store;
use App\Models\User;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

dataset('supplier renderers', ['react', 'vue', 'svelte']);

/** @return array{User, Store} */
function supplierManager(StaffRole $role = StaffRole::Owner): array
{
    $user = User::factory()->create();
    $store = Store::factory()->create();
    $user->stores()->attach($store, ['role' => $role->value]);
    SupplierApi::reset([$store->slug]);

    return [$user, $store];
}

/** @return array<string, array<string, mixed>> */
function storedSuppliers(Store $store): array
{
    return json_decode((string) file_get_contents(SupplierApi::path()), true)[$store->slug];
}

function supplierPage(TestCase $test, string $url): array
{
    return $test->get($url, ['X-Inertia' => 'true', 'X-Inertia-Version' => (string) app(HandleInertiaRequests::class)->version(request())])->json('props.page') ?? [];
}

it('answers the fake API with search, paging, validation and auth', function (): void {
    SupplierApi::reset(['manama']);

    [$status, $body] = SupplierApi::respond('GET', null, ['search' => 'oud', 'per_page' => 2], [], 'manama', SupplierApi::TOKEN);
    expect($status)->toBe(200)->and($body['data'])->toHaveCount(2)->and($body['meta']['total'])->toBe(3);

    [$status, $body] = SupplierApi::respond('POST', null, [], ['name' => 'Grasse Absolutes', 'email' => 'a@b.test', 'country' => 'FR', 'category' => 'florals'], 'manama', SupplierApi::TOKEN);
    expect($status)->toBe(422)->and($body['errors'])->toHaveKey('name');

    expect(SupplierApi::respond('GET', null, [], [], 'manama', 'wrong')[0])->toBe(401)
        ->and(SupplierApi::respond('GET', null, [], [], 'nowhere', SupplierApi::TOKEN)[0])->toBe(404);

    $this->getJson('/demo-api/suppliers', ['Authorization' => 'Bearer '.SupplierApi::TOKEN, 'X-Store' => 'manama'])->assertOk()->assertJsonPath('meta.total', 10);
    $this->postJson('/demo-api/suppliers', [], ['Authorization' => 'Bearer '.SupplierApi::TOKEN, 'X-Store' => 'manama'])->assertStatus(422);
});

it('lists, searches and opens suppliers from the API on every renderer', function (string $renderer): void {
    [$user, $store] = supplierManager();
    $this->actingAs($user);

    $page = supplierPage($this, "/{$renderer}/admin/{$store->slug}/suppliers?search=taif");
    $records = $page['content'][0]['records'];

    expect(array_column(array_column(array_column($records, 'cells'), 'name'), 'state'))->toBe(['Taif Rose Farms']);

    $id = $records[0]['key'];
    $this->get("/{$renderer}/admin/{$store->slug}/suppliers/{$id}")->assertOk();
    $this->get("/{$renderer}/admin/{$store->slug}/suppliers/{$id}/edit")->assertOk();

    Http::assertSent(fn (Request $request): bool => $request->hasHeader('X-Store', $store->slug));
})->with('supplier renderers');

it('creates, edits and deletes suppliers through the API, showing its validation errors', function (): void {
    [$user, $store] = supplierManager();
    $this->actingAs($user);

    $token = supplierPage($this, "/react/admin/{$store->slug}/suppliers/create")['token'];
    $post = fn (array $data, array $extra = []) => $this->post("/react/admin/{$store->slug}/_alfakit/actions", ['token' => $token, 'action' => 'create', 'data' => $data, ...$extra], ['X-Inertia' => 'true', 'Accept' => 'application/json']);

    $post(['name' => 'Grasse Absolutes', 'email' => 'new@grasse.test', 'country' => 'FR', 'category' => 'florals', 'status' => 'active'])
        ->assertStatus(422)->assertJsonValidationErrors(['name' => 'A supplier with this name already exists in this store.']);

    $post(['name' => 'Mysore Sandalwood', 'email' => 'hello@mysore.test', 'country' => 'in', 'category' => 'resins', 'status' => 'active', 'lead_time_days' => 30])->assertRedirect();

    $created = collect(storedSuppliers($store))->firstWhere('name', 'Mysore Sandalwood');
    expect($created)->toMatchArray(['country' => 'IN', 'lead_time_days' => 30]);

    $edit = supplierPage($this, "/react/admin/{$store->slug}/suppliers/{$created['id']}/edit");
    expect($edit['content'][0]['state'])->toMatchArray(['name' => 'Mysore Sandalwood', 'category' => 'resins']);

    $this->post("/react/admin/{$store->slug}/_alfakit/actions", ['token' => $edit['token'], 'action' => 'save', 'data' => [...Arr::only($created, ['name', 'email', 'country', 'category', 'status']), 'rating' => 5]], ['X-Inertia' => 'true', 'Accept' => 'application/json'])
        ->assertRedirect();
    expect(storedSuppliers($store)[$created['id']]['rating'])->toBe(5);

    $this->post("/react/admin/{$store->slug}/_alfakit/actions", ['token' => $edit['token'], 'action' => 'delete'], ['X-Inertia' => 'true', 'Accept' => 'application/json'])
        ->assertRedirect(url("/react/admin/{$store->slug}/suppliers"));
    expect(storedSuppliers($store))->not->toHaveKey($created['id']);
});

it('lets staff browse suppliers but not change them', function (): void {
    [$user, $store] = supplierManager(StaffRole::Staff);
    $this->actingAs($user);

    $this->get("/react/admin/{$store->slug}/suppliers")->assertOk();
    $this->get("/react/admin/{$store->slug}/suppliers/create")->assertForbidden();
});

it('translates every supplier string into Arabic', function (): void {
    $english = array_keys(Arr::dot(require lang_path('en/suppliers.php')));
    $arabic = array_keys(Arr::dot(require lang_path('ar/suppliers.php')));

    expect(array_diff($english, $arabic))->toBe([])->and(array_diff($arabic, $english))->toBe([]);
});
