<?php

declare(strict_types=1);

use AlfaSix\AlfakitActivityLog\RelationManagers\ActivitiesRelationManager;
use AlfaSix\AlfakitActivityLog\Resources\ActivityResource;
use AlfaSix\AlfakitActivityLog\Tests\Fixtures\Models\Article;
use AlfaSix\AlfakitActivityLog\Tests\Fixtures\Policies\ActivityPolicy;
use AlfaSix\AlfakitActivityLog\Tests\Fixtures\Resources\EditArticle;
use Illuminate\Support\Facades\Gate;
use Spatie\Activitylog\Models\Activity;

use function AlfaSix\AlfakitActivityLog\Tests\inertiaGet;
use function AlfaSix\AlfakitActivityLog\Tests\inertiaProps;
use function AlfaSix\AlfakitActivityLog\Tests\makeUser;
use function AlfaSix\AlfakitActivityLog\Tests\plugin;
use function Pest\Laravel\actingAs;

uses(AlfaSix\AlfakitActivityLog\Tests\TestCase::class);

require_once __DIR__.'/helpers.php';

beforeEach(function (): void {
    alfakit()->setCurrentPanel(alfakit()->getPanel('activity'));
});

it('lists the record activities in the relation manager', function (): void {
    actingAs(makeUser());

    $article = Article::query()->create(['title' => 'Hello', 'status' => 'draft']);
    $article->update(['status' => 'published']);
    $other = Article::query()->create(['title' => 'Other']);

    $mine = Activity::query()->forSubject($article)->get();
    $updated = $mine->firstWhere('event', 'updated');

    alfakit()->testPage(EditArticle::class, ['record' => $article], panel: 'activity')
        ->relationManager(ActivitiesRelationManager::class)
        ->assertCanSeeTableRecords($mine)
        ->assertCanNotSeeTableRecords(Activity::query()->forSubject($other)->get())
        ->assertCountTableRecords(2)
        ->filterTable('event', 'updated')
        ->assertCountTableRecords(1)
        ->mountTableAction('view', $updated)
        ->assertMountedActionModalSee(['draft', 'published', 'Old value', 'New value']);
});

it('names the relation manager tab and hides it from unauthorised users', function (): void {
    actingAs(makeUser());
    $article = Article::query()->create(['title' => 'Hello']);

    expect(ActivitiesRelationManager::getTitle())->toBe('Activity')
        ->and(ActivitiesRelationManager::canViewForRecord($article, EditArticle::class))->toBeTrue();

    plugin()->authorize(false);

    expect(ActivitiesRelationManager::canViewForRecord($article, EditArticle::class))->toBeFalse();
});

it('falls back to the activity policy without an authorize closure', function (): void {
    Gate::policy(Activity::class, ActivityPolicy::class);
    actingAs($user = makeUser('Ada'));

    inertiaGet('/activity/activity-log')->assertForbidden();

    $user->update(['name' => 'Auditor']);

    inertiaGet('/activity/activity-log')->assertOk();
    alfakit()->setCurrentPanel(alfakit()->getPanel('activity'));
    expect(ActivityResource::canViewAny())->toBeTrue();
});

it('shows a timeline of the record activities in an infolist', function (): void {
    actingAs(makeUser('Ada'));

    $article = Article::query()->create(['title' => 'Hello', 'status' => 'draft']);
    $article->update(['status' => 'published']);

    $content = inertiaProps('/activity/articles/'.$article->getKey())['page']['content'];
    $timeline = collect($content[0]['components'])->firstWhere('type', 'RepeatableEntry');

    expect($timeline['name'])->toBe('activities')
        ->and($timeline['label'])->toBe('Activity')
        ->and($timeline['items'])->toHaveCount(2);

    $first = collect($timeline['items'][0])->keyBy('name');

    expect($first['summary']['state'])->toBe('Updated by Ada')
        ->and($first['changes']['items'][0])->toHaveCount(3)
        ->and(array_column($first['changes']['items'][0], 'state'))->toBe(['Status', 'draft', 'published']);
});

it('limits and filters the timeline', function (): void {
    $article = Article::query()->create(['title' => 'Hello']);
    $article->update(['title' => 'Two']);
    $article->update(['title' => 'Three']);

    $entry = AlfaSix\AlfakitActivityLog\Infolists\Components\ActivityLogTimelineEntry::make()->limit(2);

    expect($entry->getActivities($article))->toHaveCount(2)
        ->and($entry->modifyQueryUsing(fn ($query) => $query->where('event', 'created'))->limit(null)->getActivities($article))->toHaveCount(1);
});
