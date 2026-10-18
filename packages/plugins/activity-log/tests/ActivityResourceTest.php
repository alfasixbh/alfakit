<?php

declare(strict_types=1);

use AlfaSix\AlfakitActivityLog\ActivityLogPlugin;
use AlfaSix\AlfakitActivityLog\Resources\ActivityResource;
use AlfaSix\AlfakitActivityLog\Resources\ActivityResource\Pages\ListActivities;
use AlfaSix\AlfakitActivityLog\Tests\Fixtures\Models\Article;
use AlfaSix\AlfakitActivityLog\Tests\Fixtures\Models\Note;
use Spatie\Activitylog\Models\Activity;

use function AlfaSix\AlfakitActivityLog\Tests\inertiaGet;
use function AlfaSix\AlfakitActivityLog\Tests\inertiaProps;
use function AlfaSix\AlfakitActivityLog\Tests\logged;
use function AlfaSix\AlfakitActivityLog\Tests\makeUser;
use function AlfaSix\AlfakitActivityLog\Tests\plugin;
use function Pest\Laravel\actingAs;

uses(AlfaSix\AlfakitActivityLog\Tests\TestCase::class);

require_once __DIR__.'/helpers.php';

beforeEach(function (): void {
    alfakit()->setCurrentPanel(alfakit()->getPanel('activity'));
});

it('registers the activity resource on the panel', function (): void {
    $panel = alfakit()->getPanel('activity');

    expect($panel->hasPlugin('activity-log'))->toBeTrue()
        ->and(ActivityLogPlugin::get())->toBe(plugin())
        ->and($panel->getResources())->toContain(ActivityResource::class)
        ->and(ActivityResource::getNavigationGroup())->toBe('Audit')
        ->and(ActivityResource::getNavigationSort())->toBe(5)
        ->and(ActivityResource::getNavigationIcon())->toBe('history')
        ->and(ActivityResource::getNavigationLabel())->toBe('Activity log')
        ->and(ActivityResource::getModelLabel())->toBe('activity')
        ->and(ActivityResource::getSlug())->toBe('activity-log')
        ->and(ActivityResource::canCreate())->toBeFalse();
});

it('takes navigation, label and badge options as closures', function (): void {
    plugin()
        ->navigationLabel(fn (): string => 'Audit trail')
        ->navigationIcon('scroll-text')
        ->label('event')
        ->pluralLabel('events')
        ->navigationCountBadge();

    Article::query()->create(['title' => 'One']);

    expect(ActivityResource::getNavigationLabel())->toBe('Audit trail')
        ->and(ActivityResource::getNavigationIcon())->toBe('scroll-text')
        ->and(ActivityResource::getPluralModelLabel())->toBe('events')
        ->and(ActivityResource::getNavigationBadge())->toBe(1);
});

it('lists activities and shows one with its old and new values', function (): void {
    actingAs(makeUser());

    $article = Article::query()->create(['title' => 'Hello', 'status' => 'draft']);
    $article->update(['title' => 'Hello world', 'status' => 'published']);

    $updated = Activity::query()->where('event', 'updated')->firstOrFail();

    $table = collect(inertiaProps('/activity/activity-log')['page']['content'])->firstWhere('type', 'Table');

    expect($table['records'])->toHaveCount(2)
        ->and($table['records'][0]['cells']['event']['state'])->toBe('Updated')
        ->and($table['records'][0]['cells']['subject_type']['state'])->toBe('Article: Hello world')
        ->and($table['records'][0]['cells']['causer_id']['state'])->toBe('Ada Admin');

    $content = inertiaProps('/activity/activity-log/'.$updated->getKey())['page']['content'];
    $changes = collect($content[0]['components'])->firstWhere('label', 'Changes')['schema'][0];

    expect(array_column($changes['table'], 'label'))->toBe(['Attribute', 'Old value', 'New value'])
        ->and(array_map(static fn (array $item): array => array_column($item, 'state'), $changes['items']))->toBe([
            ['Title', 'Hello', 'Hello world'],
            ['Status', 'draft', 'published'],
        ]);
});

it('shows custom properties without the plugin keys', function (): void {
    actingAs(makeUser());

    $activity = logged(activity('orders')->withProperties(['ip' => '127.0.0.1', 'alfakit_tenant_id' => 1])->log('Exported orders'));

    $content = inertiaProps('/activity/activity-log/'.$activity->getKey())['page']['content'];
    $properties = collect($content[0]['components'])->firstWhere('label', 'Properties')['schema'][0];

    expect($properties['state'])->toBe(['ip' => '127.0.0.1'])
        ->and(collect($content[0]['components'])->firstWhere('label', 'Changes'))->toBeNull();
});

it('filters by log, event, causer, subject type and date', function (): void {
    $ada = makeUser('Ada');
    $bob = makeUser('Bob');
    actingAs($ada);

    $article = Article::query()->create(['title' => 'Hello']);
    $orders = logged(activity('orders')->causedBy($bob)->performedOn(Note::query()->create(['body' => 'x']))->event('exported')->log('Exported'));
    $old = logged(activity('orders')->causedBy($bob)->log('Old'));
    $old->forceFill(['created_at' => now()->subMonth()])->save();

    $created = Activity::query()->where('event', 'created')->firstOrFail();

    alfakit()->testPage(ListActivities::class, panel: 'activity')
        ->assertCountTableRecords(3)
        ->filterTable('log_name', 'orders')
        ->assertCanSeeTableRecords([$orders, $old])
        ->assertCanNotSeeTableRecords([$created])
        ->resetTableFilters()
        ->filterTable('event', 'created')
        ->assertCanSeeTableRecords([$created])
        ->assertCountTableRecords(1)
        ->resetTableFilters()
        ->filterTable('causer', $bob->getMorphClass().'|'.$bob->getKey())
        ->assertCanSeeTableRecords([$orders, $old])
        ->assertCountTableRecords(2)
        ->resetTableFilters()
        ->filterTable('subject_type', $article->getMorphClass())
        ->assertCanSeeTableRecords([$created])
        ->assertCountTableRecords(1)
        ->resetTableFilters()
        ->filterTable('created_at', ['created_from' => now()->subDay()->toDateString()])
        ->assertCanNotSeeTableRecords([$old])
        ->assertCountTableRecords(2);
});

it('offers the log names, events, causers and subject types as filter options', function (): void {
    actingAs($ada = makeUser('Ada'));

    Article::query()->create(['title' => 'Hello']);
    activity('orders')->event('exported')->log('Exported');

    expect(AlfaSix\AlfakitActivityLog\Support\ActivitySchema::distinctOptions('log_name'))->toBe(['default' => 'default', 'orders' => 'orders'])
        ->and(AlfaSix\AlfakitActivityLog\Support\ActivitySchema::causerOptions())->toBe([$ada->getMorphClass().'|'.$ada->getKey() => 'Ada']);
});

it('authorises with the plugin closure', function (): void {
    actingAs($user = makeUser());
    $activity = logged(activity()->log('Something'));

    plugin()->authorize(fn (mixed $user): bool => $user?->name === 'Root');

    inertiaGet('/activity/activity-log')->assertForbidden();
    inertiaGet('/activity/activity-log/'.$activity->getKey())->assertForbidden();
    alfakit()->setCurrentPanel(alfakit()->getPanel('activity'));
    expect(ActivityResource::getNavigationItems())->toBe([]);

    $user->update(['name' => 'Root']);

    inertiaGet('/activity/activity-log')->assertOk();
    inertiaGet('/activity/activity-log/'.$activity->getKey())->assertOk();
    alfakit()->setCurrentPanel(alfakit()->getPanel('activity'));
    expect(ActivityResource::getNavigationItems())->toHaveCount(1);
});

it('hides the navigation item when asked', function (): void {
    actingAs(makeUser());

    plugin()->registerNavigation(false);

    expect(ActivityResource::getNavigationItems())->toBe([]);
    inertiaGet('/activity/activity-log')->assertOk();
});

it('never creates, edits or deletes activities', function (): void {
    actingAs(makeUser());
    $activity = logged(activity()->log('Something'));

    expect(ActivityResource::canEdit($activity))->toBeFalse()
        ->and(ActivityResource::canDelete($activity))->toBeFalse()
        ->and(ActivityResource::hasPage('create'))->toBeFalse();

    inertiaGet('/activity/activity-log/create')->assertNotFound();
});
