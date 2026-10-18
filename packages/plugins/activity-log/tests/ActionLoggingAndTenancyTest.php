<?php

declare(strict_types=1);

use AlfaSix\Alfakit\Tests\Fixtures\Models\Team;
use AlfaSix\Alfakit\Tests\Fixtures\Models\TenantUser;
use AlfaSix\AlfakitActivityLog\Resources\ActivityResource\Pages\ListActivities;
use AlfaSix\AlfakitActivityLog\Support\ActionActivityLogger;
use AlfaSix\AlfakitActivityLog\Support\TenantActivityScope;
use AlfaSix\AlfakitActivityLog\Tests\Fixtures\Models\Article;
use AlfaSix\AlfakitActivityLog\Tests\Fixtures\Models\Note;
use AlfaSix\AlfakitActivityLog\Tests\Fixtures\Resources\CreateNote;
use AlfaSix\AlfakitActivityLog\Tests\Fixtures\Resources\EditNote;
use AlfaSix\AlfakitActivityLog\Tests\Fixtures\Resources\ListArticles;
use AlfaSix\AlfakitActivityLog\Tests\Fixtures\Resources\ListNotes;
use Spatie\Activitylog\Models\Activity;

use function AlfaSix\AlfakitActivityLog\Tests\inertiaGet;
use function AlfaSix\AlfakitActivityLog\Tests\inertiaProps;
use function AlfaSix\AlfakitActivityLog\Tests\logged;
use function AlfaSix\AlfakitActivityLog\Tests\makeUser;
use function AlfaSix\AlfakitActivityLog\Tests\plugin;
use function Pest\Laravel\actingAs;

uses(AlfaSix\AlfakitActivityLog\Tests\TestCase::class);

require_once __DIR__.'/helpers.php';

// ---------------------------------------------------------------- Action logging

it('logs create, edit and delete table actions for models without LogsActivity', function (): void {
    actingAs(makeUser('Ada'));
    $note = Note::query()->create(['body' => 'First']);

    alfakit()->testPage(ListNotes::class, panel: 'activity')
        ->callTableAction('edit', $note, ['body' => 'Second'])
        ->assertHasNoFormErrors();

    $updated = Activity::query()->forSubject($note)->forEvent('updated')->sole();

    expect($updated->attribute_changes?->toArray())->toBe(['attributes' => ['body' => 'Second'], 'old' => ['body' => 'First']])
        ->and($updated->causer?->getAttribute('name'))->toBe('Ada');

    alfakit()->testPage(ListNotes::class, panel: 'activity')
        ->callTableAction('delete', $note);

    expect(Activity::query()->forSubject($note)->forEvent('deleted')->sole()->attribute_changes?->get('old'))->toMatchArray(['body' => 'Second']);

    alfakit()->testPage(ListNotes::class, panel: 'activity')
        ->callTableAction('create', null, ['body' => 'Third']);

    $third = Note::query()->where('body', 'Third')->sole();

    expect(Activity::query()->forSubject($third)->forEvent('created')->sole()->attribute_changes?->get('attributes'))->toMatchArray(['body' => 'Third']);
});

it('does not log twice for models that use LogsActivity', function (): void {
    actingAs(makeUser());
    $article = Article::query()->create(['title' => 'Hello']);

    alfakit()->testPage(ListArticles::class, panel: 'activity')
        ->callTableAction('edit', $article, ['title' => 'Changed'])
        ->assertHasNoFormErrors();

    expect(Activity::query()->forSubject($article)->forEvent('updated')->count())->toBe(1);
});

it('logs create and edit pages with the LogsAlfakitActions trait', function (): void {
    actingAs(makeUser());

    alfakit()->testPage(CreateNote::class, panel: 'activity')
        ->fillForm(['body' => 'Draft'])
        ->call('create')
        ->assertHasNoFormErrors();

    $note = Note::query()->sole();

    alfakit()->testPage(EditNote::class, ['record' => $note], panel: 'activity')
        ->fillForm(['body' => 'Final'])
        ->call('save')
        ->assertHasNoFormErrors();

    expect(Activity::query()->forSubject($note)->pluck('event')->all())->toBe(['created', 'updated'])
        ->and(Activity::query()->forSubject($note)->forEvent('updated')->sole()->attribute_changes?->get('old'))->toBe(['body' => 'Draft']);
});

it('skips updates without changes and logs only on panels that enabled it', function (): void {
    $note = Note::query()->create(['body' => 'Same']);
    $note->save();

    expect(ActionActivityLogger::log('updated', $note))->toBeNull();

    // The default panel doesn't have the plugin: table actions there log nothing.
    alfakit()->setCurrentPanel(alfakit()->getPanel('admin'));
    $action = AlfaSix\Alfakit\Actions\DeleteAction::make()->record($note);
    $action->callAfter(['record' => $note]);

    expect(Activity::query()->count())->toBe(0);
});

// ---------------------------------------------------------------- Tenancy

it('scopes the activity log to the current tenant', function (): void {
    $alpha = Team::query()->create(['name' => 'Alpha', 'slug' => 'alpha']);
    $beta = Team::query()->create(['name' => 'Beta', 'slug' => 'beta']);
    $user = TenantUser::query()->create(['name' => 'Member', 'email' => 'member@example.com', 'password' => 'password']);
    $user->teams()->attach([$alpha->id, $beta->id]);
    actingAs($user);

    $mine = Article::query()->create(['title' => 'Alpha article', 'team_id' => $alpha->id]);
    $theirs = Article::query()->create(['title' => 'Beta article', 'team_id' => $beta->id]);
    $team = logged(activity()->performedOn($alpha)->log('Renamed team'));
    $global = logged(activity()->log('Global'));

    $records = collect(inertiaProps('/activity-team/alpha/activity-log')['page']['content'])->firstWhere('type', 'Table')['records'];

    expect(array_column(array_column($records, 'cells'), 'description'))->toEqualCanonicalizing([['state' => 'created'], ['state' => 'Renamed team']]);

    alfakit()->testPage(ListActivities::class, ['tenant' => $alpha], panel: 'activity-team')
        ->assertCanSeeTableRecords(Activity::query()->forSubject($mine)->get())
        ->assertCanSeeTableRecords([$team])
        ->assertCanNotSeeTableRecords(Activity::query()->forSubject($theirs)->get())
        ->assertCanNotSeeTableRecords([$global]);

    // The record of another tenant can't be opened.
    inertiaGet('/activity-team/alpha/activity-log/'.Activity::query()->forSubject($theirs)->value('id'))->assertNotFound();
});

it('records the tenant on activities logged during a tenant request', function (): void {
    $alpha = Team::query()->create(['name' => 'Alpha', 'slug' => 'alpha']);
    $user = TenantUser::query()->create(['name' => 'Member', 'email' => 'member@example.com', 'password' => 'password']);
    $user->teams()->attach($alpha);
    actingAs($user);

    $article = Article::query()->create(['title' => 'Hello', 'team_id' => $alpha->id]);

    alfakit()->testPage(ListArticles::class, ['tenant' => $alpha], panel: 'activity-team')
        ->callTableAction('delete', $article);

    $deleted = Activity::query()->forEvent('deleted')->sole();

    expect($deleted->getProperty(TenantActivityScope::TENANT_ID_PROPERTY))->toBe($alpha->id)
        ->and($deleted->getProperty(TenantActivityScope::TENANT_TYPE_PROPERTY))->toBe($alpha->getMorphClass());

    // The deleted article's activity stays in the tenant's log.
    alfakit()->testPage(ListActivities::class, ['tenant' => $alpha], panel: 'activity-team')
        ->assertCanSeeTableRecords([$deleted]);
});

it('takes a custom tenant scope or none', function (): void {
    $alpha = Team::query()->create(['name' => 'Alpha', 'slug' => 'alpha']);
    $user = TenantUser::query()->create(['name' => 'Member', 'email' => 'member@example.com', 'password' => 'password']);
    $user->teams()->attach($alpha);
    actingAs($user);

    activity('alpha')->log('In alpha');
    activity('beta')->log('In beta');

    plugin('activity-team')->scopeToTenantUsing(fn ($query, Team $tenant) => $query->where('log_name', $tenant->getAttribute('slug')));

    alfakit()->testPage(ListActivities::class, ['tenant' => $alpha], panel: 'activity-team')
        ->assertCountTableRecords(1);

    plugin('activity-team')->scopeToTenant(false);

    alfakit()->testPage(ListActivities::class, ['tenant' => $alpha], panel: 'activity-team')
        ->assertCountTableRecords(2);
});
