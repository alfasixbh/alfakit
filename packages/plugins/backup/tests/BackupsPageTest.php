<?php

declare(strict_types=1);

use AlfaSix\AlfakitBackup\BackupPlugin;
use AlfaSix\AlfakitBackup\Jobs\CreateBackupJob;
use AlfaSix\AlfakitBackup\Pages\Backups;
use AlfaSix\AlfakitBackup\Support\BackupOption;
use AlfaSix\AlfakitBackup\Support\BackupRepository;
use AlfaSix\AlfakitBackup\Widgets\BackupDestinationsWidget;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

use function AlfaSix\AlfakitBackup\Tests\backupPlugin;
use function AlfaSix\AlfakitBackup\Tests\backupUser;
use function AlfaSix\AlfakitBackup\Tests\fakeBackup;
use function AlfaSix\AlfakitBackup\Tests\inertiaGet;
use function AlfaSix\AlfakitBackup\Tests\inertiaProps;
use function Pest\Laravel\actingAs;
use function Pest\Laravel\get;
use function Pest\Laravel\travel;

uses(AlfaSix\AlfakitBackup\Tests\TestCase::class);

require_once __DIR__.'/helpers.php';

beforeEach(function (): void {
    Storage::fake('backups');
    alfakit()->setCurrentPanel(alfakit()->getPanel('backups'));
});

it('registers the backups page on the panel', function (): void {
    actingAs(backupUser());

    expect(alfakit()->getPanel('backups')->hasPlugin('backup'))->toBeTrue()
        ->and(alfakit()->getPanel('backups')->getPages())->toContain(Backups::class)
        ->and(Backups::getNavigationGroup())->toBe('System')
        ->and(Backups::getNavigationIcon())->toBe('archive')
        ->and(Backups::getNavigationLabel())->toBe('Backups')
        ->and(Backups::getNavigationItems())->toHaveCount(1);
});

it('lists the backups of each disk, newest first', function (): void {
    actingAs(backupUser());

    $old = fakeBackup('2026-10-01 10:00:00', str_repeat('a', 2048));
    $new = fakeBackup(now()->format('Y-m-d H:i:s'), 'b');

    $props = inertiaProps('/backups-panel/backups');
    $table = collect($props['page']['content'])->firstWhere('type', 'Table');

    expect($props['page']['title'])->toBe('Backups')
        ->and($table['pollingInterval'])->toBe('4s')
        ->and(array_column(array_column($table['records'], 'cells'), 'name'))->toBe([
            ['state' => basename($new), 'description' => $new],
            ['state' => basename($old), 'description' => $old],
        ])
        ->and($table['records'][1]['cells']['size']['state'])->toBe('2 kB')
        ->and($table['records'][1]['cells']['disk']['state'])->toBe('backups');

    alfakit()->testPage(Backups::class, panel: 'backups')
        ->assertCountTableRecords(2)
        ->filterTable('disk', 'backups')
        ->assertCountTableRecords(2);
});

it('shows the health of each destination', function (): void {
    actingAs(backupUser());

    $widget = BackupDestinationsWidget::make()->toSchema();

    expect($widget['pollingInterval'])->toBe('4s')
        ->and($widget['stats'])->toHaveCount(1)
        ->and($widget['stats'][0]['label'])->toBe('alfakit-test on backups')
        ->and($widget['stats'][0]['value'])->toBe('Unhealthy')
        ->and($widget['stats'][0]['color'])->toBe('danger');

    fakeBackup(now()->format('Y-m-d H:i:s'), str_repeat('x', 1024));

    $widget = BackupDestinationsWidget::make()->toSchema();

    expect($widget['stats'][0]['value'])->toBe('Healthy')
        ->and($widget['stats'][0]['color'])->toBe('success')
        ->and($widget['stats'][0]['description'])->toStartWith('1 backup · 1 kB used · newest');
});

it('queues a backup with the chosen option instead of running it', function (string $option, array $commandOptions): void {
    Queue::fake();
    actingAs(backupUser());

    alfakit()->testPage(Backups::class, panel: 'backups')
        ->callAction('create', ['option' => $option])
        ->assertHasNoActionErrors()
        ->assertNotified('Creating a new backup in the background');

    Queue::assertPushedOn('backups', CreateBackupJob::class, function (CreateBackupJob $job) use ($option, $commandOptions): bool {
        return $job->option === BackupOption::from($option)
            && $job->timeout === 600
            && $job->getCommandOptions() === $commandOptions;
    });
})->with([
    'database and files' => ['all', ['--timeout' => 600]],
    'database only' => ['only-db', ['--only-db' => true, '--timeout' => 600]],
    'files only' => ['only-files', ['--only-files' => true, '--timeout' => 600]],
]);

it('runs backup:run from the job', function (): void {
    $received = [];

    // Stands in for spatie's command: no backup really runs.
    Artisan::command('backup:run {--only-db} {--only-files} {--timeout=}', function () use (&$received): void {
        $received = array_filter($this->options());
    });

    app()->call([new CreateBackupJob(BackupOption::OnlyDb), 'handle']);

    expect($received)->toBe(['only-db' => true]);
});

it('downloads a backup through a signed link', function (): void {
    actingAs(backupUser());
    $path = fakeBackup('2026-10-01 10:00:00', 'archive-contents');

    $url = Backups::getDownloadUrl('backups', $path);
    $notABackup = Backups::getDownloadUrl('backups', 'secrets/.env');

    expect($url)->toContain('/backups-panel/backups/download?')->toContain('signature=');

    $response = get($url);
    $response->assertOk()->assertDownload(basename($path));
    expect($response->streamedContent())->toBe('archive-contents');

    // Without (or with a tampered) signature, for files that aren't backups, after expiry.
    get('/backups-panel/backups/download?disk=backups&path='.urlencode($path))->assertForbidden();
    get(str_replace('alfakit-test', 'other', $url))->assertForbidden();
    get($notABackup)->assertNotFound();

    travel(10)->minutes();
    get($url)->assertForbidden();
});

it('links each backup to its download', function (): void {
    actingAs(backupUser());
    fakeBackup('2026-10-01 10:00:00');

    $table = collect(inertiaProps('/backups-panel/backups')['page']['content'])->firstWhere('type', 'Table');
    $download = collect($table['records'][0]['actions'])->firstWhere('name', 'download');

    expect($download['url'])->toContain('/backups-panel/backups/download?')->toContain('signature=');
});

it('deletes a backup', function (): void {
    actingAs(backupUser());
    $keep = fakeBackup('2026-10-01 10:00:00');
    $delete = fakeBackup('2026-10-02 10:00:00');

    alfakit()->testPage(Backups::class, panel: 'backups')
        ->callTableAction('delete', BackupRepository::key('backups', $delete))
        ->assertNotified('Backup deleted')
        ->assertCountTableRecords(1);

    Storage::disk('backups')->assertMissing($delete);
    Storage::disk('backups')->assertExists($keep);
});

it('authorises the page, the actions and downloads with the plugin closure', function (): void {
    actingAs($user = backupUser('Ada'));
    $path = fakeBackup('2026-10-01 10:00:00');
    $url = Backups::getDownloadUrl('backups', $path);

    backupPlugin()->authorize(fn (mixed $user): bool => $user?->name === 'Root');

    inertiaGet('/backups-panel/backups')->assertForbidden();
    get($url)->assertForbidden();
    alfakit()->setCurrentPanel(alfakit()->getPanel('backups'));
    expect(Backups::getNavigationItems())->toBe([])
        ->and(BackupDestinationsWidget::canView())->toBeFalse();

    $user->update(['name' => 'Root']);

    inertiaGet('/backups-panel/backups')->assertOk();
    get($url)->assertOk();
});

it('takes the polling interval, page and navigation options', function (): void {
    actingAs(backupUser());
    backupPlugin()->usingPollingInterval(null)->navigationLabel(fn (): string => 'Snapshots')->navigationSort(3)->registerNavigation(false);

    $table = collect(inertiaProps('/backups-panel/backups')['page']['content'])->firstWhere('type', 'Table');

    alfakit()->setCurrentPanel(alfakit()->getPanel('backups'));

    expect($table)->not->toHaveKey('pollingInterval')
        ->and(Backups::getNavigationLabel())->toBe('Snapshots')
        ->and(Backups::getNavigationSort())->toBe(3)
        ->and(Backups::getNavigationItems())->toBe([])
        ->and(BackupPlugin::make()->noTimeout()->getTimeout())->toBe(0);
});
