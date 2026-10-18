<?php

declare(strict_types=1);

use AlfaSix\Alfakit\Pages\Dashboard;
use AlfaSix\Alfakit\Panel;
use AlfaSix\Alfakit\Tests\Fixtures\AuthTenancy\Panels;
use AlfaSix\Alfakit\Tests\Fixtures\Models\Team;
use AlfaSix\Alfakit\Tests\Fixtures\Models\TenantUser;
use AlfaSix\Alfakit\Tests\Fixtures\Models\User;
use AlfaSix\AlfakitTree\Support\TreeStructure;
use AlfaSix\AlfakitTree\Tests\Fixtures\Category;
use AlfaSix\AlfakitTree\Tests\Fixtures\CategoryPolicy;
use AlfaSix\AlfakitTree\Tests\Fixtures\CategoryResource;
use AlfaSix\AlfakitTree\Tests\Fixtures\CategoryTreeWidget;
use AlfaSix\AlfakitTree\Tests\TestCase as TreeTestCase;
use AlfaSix\AlfakitTree\TreePlugin;
use Illuminate\Support\Facades\Gate;

uses(TreeTestCase::class);

function treeTest(): TreeTestCase
{
    return TreeTestCase::current();
}

function treePanel(): Panel
{
    return Panels::register('trees', fn (Panel $panel): Panel => $panel
        ->plugin(TreePlugin::make())
        ->resources([CategoryResource::class])
        ->pages([Dashboard::class])
        ->widgets([CategoryTreeWidget::class]));
}

function treeUser(string $email = 'editor@example.com'): User
{
    return User::query()->create(['name' => 'Tree', 'email' => $email, 'password' => 'secret']);
}

/**
 * Electronics > Phones > Android, Electronics > Laptops, Books.
 *
 * @return array<string, Category>
 */
function treeCategories(?int $team = null): array
{
    $electronics = Category::query()->create(['title' => 'Electronics', 'team_id' => $team]);
    $phones = Category::query()->create(['title' => 'Phones', 'parent_id' => $electronics->id, 'team_id' => $team]);
    $android = Category::query()->create(['title' => 'Android', 'parent_id' => $phones->id, 'team_id' => $team]);
    $laptops = Category::query()->create(['title' => 'Laptops', 'parent_id' => $electronics->id, 'team_id' => $team]);
    $books = Category::query()->create(['title' => 'Books', 'team_id' => $team]);

    return compact('electronics', 'phones', 'android', 'laptops', 'books');
}

/**
 * @return array{0: string, 1: array<string, mixed>}
 */
function treePage(string $url = '/trees/categories'): array
{
    $props = treeTest()->inertiaProps($url);
    $block = collect($props['page']['content'])->firstWhere('key', 'tree');

    return [$props['page']['token'], $block['components'][0], $props['page']];
}

beforeEach(function (): void {
    Gate::policy(Category::class, CategoryPolicy::class);
});

it('registers on a panel and shares its frontend strings', function (): void {
    $panel = treePanel();

    expect($panel->getPlugin('tree'))->toBeInstanceOf(TreePlugin::class)
        ->and($panel->getFrontendTranslations()['tree']['expand_all'])->toBe('Expand all');
});

it('orders new records after their siblings and exposes the tree relations', function (): void {
    $categories = treeCategories();

    expect($categories['books']->order)->toBe(2)
        ->and($categories['laptops']->order)->toBe(2)
        ->and($categories['electronics']->children->pluck('title')->all())->toBe(['Phones', 'Laptops'])
        ->and($categories['android']->ancestors()->pluck('title')->all())->toBe(['Phones', 'Electronics'])
        ->and(Category::query()->isRoot()->ordered()->pluck('title')->all())->toBe(['Electronics', 'Books'])
        ->and($categories['android']->isRoot())->toBeFalse();
});

it('renders the tree page with nested nodes, node actions and a create action', function (): void {
    treePanel();
    treeTest()->actingAs(treeUser());
    $categories = treeCategories();

    [, $tree, $page] = treePage();

    expect($tree['type'])->toBe('tree')
        ->and($tree['actionComponent'])->toBe('tree')
        ->and($tree['maxDepth'])->toBe(3)
        ->and($tree['reorderable'])->toBeTrue()
        ->and(collect($tree['nodes'])->pluck('title')->all())->toBe(['Electronics', 'Books'])
        ->and($tree['nodes'][0]['children'][0]['title'])->toBe('Phones')
        ->and($tree['nodes'][0]['children'][0]['children'][0]['key'])->toBe((string) $categories['android']->id)
        ->and(collect($tree['nodes'][1]['actions'])->pluck('name')->all())->toBe(['edit', 'delete'])
        ->and($page['headerActions'][0]['name'])->toBe('create');
});

it('saves a new structure in one request', function (): void {
    treePanel();
    treeTest()->actingAs(treeUser());
    $c = treeCategories();
    [$token] = treePage();

    $response = treeTest()->treeAction('trees', $token, 'tree', TreeStructure::REORDER_ACTION, ['arguments' => ['tree' => [
        ['key' => $c['books']->id, 'parent' => null],
        ['key' => $c['laptops']->id, 'parent' => $c['books']->id],
        ['key' => $c['electronics']->id, 'parent' => null],
        ['key' => $c['phones']->id, 'parent' => $c['electronics']->id],
        ['key' => $c['android']->id, 'parent' => $c['electronics']->id],
    ]]])->assertOk();

    expect($response->json('result.ok'))->toBeTrue()
        ->and($response->json('result.changed'))->toBe(4)
        ->and($response->json('result.notifications.0.title'))->toBe('Order saved')
        ->and(Category::query()->isRoot()->ordered()->pluck('title')->all())->toBe(['Books', 'Electronics'])
        ->and($c['laptops']->refresh()->parent_id)->toBe($c['books']->id)
        ->and($c['electronics']->refresh()->children->pluck('title')->all())->toBe(['Phones', 'Android']);
});

it('rejects cycles, duplicates, unknown records and trees that are too deep', function (array $tree, string $message): void {
    treePanel();
    treeTest()->actingAs(treeUser());
    $c = treeCategories();
    [$token] = treePage();
    $ids = array_map(static fn (Category $category): int => $category->id, $c);
    $tree = array_map(static fn (array $item): array => ['key' => $ids[$item[0]] ?? $item[0], 'parent' => $item[1] === null ? null : ($ids[$item[1]] ?? $item[1])], $tree);

    treeTest()->treeAction('trees', $token, 'tree', TreeStructure::REORDER_ACTION, ['arguments' => ['tree' => $tree]])
        ->assertUnprocessable()
        ->assertJsonPath('errors.tree.0', $message);

    expect($c['electronics']->refresh()->parent_id)->toBeNull()
        ->and($c['books']->refresh()->parent_id)->toBeNull();
})->with([
    'a cycle' => [[['electronics', 'android']], 'A record cannot be moved inside itself.'],
    'a self parent' => [[['books', 'books']], 'A record cannot be moved inside itself.'],
    'a duplicate' => [[['books', null], ['books', 'electronics']], 'A record appears more than once in the tree.'],
    'an unknown record' => [[[999, null]], 'A record in the tree no longer exists. Reload the page and try again.'],
    'an unknown parent' => [[['books', 999]], 'A parent record no longer exists. Reload the page and try again.'],
    'too deep' => [[['books', 'android']], 'The tree can be at most 3 levels deep.'],
]);

it('refuses to save when the policy denies reordering', function (): void {
    treePanel();
    treeTest()->actingAs(treeUser('viewer@example.com'));
    $c = treeCategories();
    [$token, $tree] = treePage();

    expect($tree['reorderable'])->toBeFalse();

    treeTest()->treeAction('trees', $token, 'tree', TreeStructure::REORDER_ACTION, ['arguments' => ['tree' => [
        ['key' => $c['books']->id, 'parent' => $c['electronics']->id],
    ]]])->assertForbidden();

    expect($c['books']->refresh()->parent_id)->toBeNull();
});

it('runs node actions for the node record', function (): void {
    treePanel();
    treeTest()->actingAs(treeUser());
    $c = treeCategories();
    $keep = Category::query()->create(['title' => 'Keep']);
    [$token, $tree] = treePage();

    expect(collect($tree['nodes'])->firstWhere('title', 'Keep'))->not->toHaveKey('actions.1');

    $modal = treeTest()->getJson('/trees/_alfakit/actions/modal?'.http_build_query([
        'token' => $token, 'component' => 'tree', 'action' => 'edit', 'record' => $c['books']->id,
    ]))->assertOk()->json();

    expect($modal['form']['state']['title'])->toBe('Books');

    treeTest()->post('/trees/_alfakit/actions', ['token' => $token, 'component' => 'tree', 'action' => 'delete', 'record' => $c['books']->id], ['X-Inertia' => 'true', 'X-Inertia-Version' => '']);

    expect(Category::query()->find($c['books']->id))->toBeNull();

    treeTest()->postJson('/trees/_alfakit/actions', ['token' => $token, 'component' => 'tree', 'action' => 'delete', 'record' => $keep->id])->assertForbidden();
    treeTest()->postJson('/trees/_alfakit/actions', ['token' => $token, 'component' => 'tree', 'action' => 'edit', 'record' => 999])->assertNotFound();
});

it('renders and saves a tree widget through the widget endpoint', function (): void {
    treePanel();
    treeTest()->actingAs(treeUser());
    $c = treeCategories();

    $props = treeTest()->inertiaProps('/trees');
    $widget = collect(collect($props['page']['content'])->firstWhere('key', 'widgets')['widgets'])->firstWhere('type', 'Tree');

    expect($widget['component'])->toBe('tree')
        ->and($widget['tree']['heading'])->toBe('Categories')
        ->and($widget['tree']['actionComponent'])->toBe('widget:'.$widget['id'])
        ->and($widget['tree']['maxDepth'])->toBe(2);

    // The widget allows two levels: Android under Phones would be the third.
    treeTest()->treeAction('trees', $props['page']['token'], 'widget:'.$widget['id'], TreeStructure::REORDER_ACTION, ['arguments' => ['tree' => [
        ['key' => $c['books']->id, 'parent' => $c['electronics']->id],
    ]]])->assertUnprocessable();

    treeTest()->treeAction('trees', $props['page']['token'], 'widget:'.$widget['id'], TreeStructure::REORDER_ACTION, ['arguments' => ['tree' => [
        ['key' => $c['android']->id, 'parent' => null],
        ['key' => $c['books']->id, 'parent' => $c['phones']->id],
    ]]])->assertUnprocessable();

    treeTest()->treeAction('trees', $props['page']['token'], 'widget:'.$widget['id'], TreeStructure::REORDER_ACTION, ['arguments' => ['tree' => [
        ['key' => $c['android']->id, 'parent' => null],
        ['key' => $c['books']->id, 'parent' => null],
        ['key' => $c['laptops']->id, 'parent' => $c['phones']->id],
    ]]])->assertUnprocessable();

    treeTest()->treeAction('trees', $props['page']['token'], 'widget:'.$widget['id'], TreeStructure::REORDER_ACTION, ['arguments' => ['tree' => [
        ['key' => $c['android']->id, 'parent' => $c['electronics']->id],
        ['key' => $c['laptops']->id, 'parent' => $c['electronics']->id],
        ['key' => $c['phones']->id, 'parent' => $c['electronics']->id],
    ]]])->assertOk()->assertJsonPath('result.ok', true);

    expect($c['electronics']->refresh()->children->pluck('title')->all())->toBe(['Android', 'Laptops', 'Phones']);
});

it('scopes the tree, its actions and saving to the current tenant', function (): void {
    Panels::register('treeteam', fn (Panel $panel): Panel => $panel
        ->tenant(Team::class, slugAttribute: 'slug')
        ->plugin(TreePlugin::make())
        ->resources([CategoryResource::class]));

    $user = TenantUser::query()->create(['name' => 'T', 'email' => 't@example.com', 'password' => 'secret']);
    $mine = Team::query()->create(['name' => 'Mine', 'slug' => 'mine']);
    $other = Team::query()->create(['name' => 'Other', 'slug' => 'other']);
    $user->teams()->attach($mine);
    treeTest()->actingAs($user);

    $ours = treeCategories($mine->id);
    $theirs = Category::query()->create(['title' => 'Theirs', 'team_id' => $other->id]);

    [$token, $tree] = treePage('/treeteam/mine/categories');

    expect(collect($tree['nodes'])->pluck('title')->all())->toBe(['Electronics', 'Books']);

    treeTest()->treeAction('treeteam/mine', $token, 'tree', TreeStructure::REORDER_ACTION, ['arguments' => ['tree' => [
        ['key' => $theirs->id, 'parent' => $ours['books']->id],
    ]]])->assertUnprocessable();

    treeTest()->treeAction('treeteam/mine', $token, 'tree', TreeStructure::REORDER_ACTION, ['arguments' => ['tree' => [
        ['key' => $ours['books']->id, 'parent' => $theirs->id],
    ]]])->assertUnprocessable();

    treeTest()->postJson('/treeteam/mine/_alfakit/actions', ['token' => $token, 'component' => 'tree', 'action' => 'delete', 'record' => $theirs->id])->assertNotFound();

    expect($theirs->refresh()->parent_id)->toBeNull()
        ->and(Category::query()->find($theirs->id))->not->toBeNull();
});
