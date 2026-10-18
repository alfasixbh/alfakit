<?php

declare(strict_types=1);

use AlfaSix\AlfakitHealth\HealthPlugin;
use AlfaSix\AlfakitHealth\Pages\Health;
use AlfaSix\AlfakitHealth\Support\HealthResults;
use AlfaSix\AlfakitHealth\Tests\Fixtures\Checks\FailingCheck;
use AlfaSix\AlfakitHealth\Tests\Fixtures\Checks\PassingCheck;
use AlfaSix\AlfakitHealth\Widgets\HealthCheckResultsWidget;
use AlfaSix\AlfakitHealth\Widgets\HealthStatusWidget;
use Spatie\Health\Facades\Health as HealthFacade;

use function AlfaSix\AlfakitHealth\Tests\forgetHealthResults;
use function AlfaSix\AlfakitHealth\Tests\healthPlugin;
use function AlfaSix\AlfakitHealth\Tests\healthUser;
use function AlfaSix\AlfakitHealth\Tests\inertiaGet;
use function AlfaSix\AlfakitHealth\Tests\inertiaProps;
use function Pest\Laravel\actingAs;

uses(AlfaSix\AlfakitHealth\Tests\TestCase::class);

require_once __DIR__.'/helpers.php';

beforeEach(function (): void {
    forgetHealthResults();
    FailingCheck::$status = 'failed';

    HealthFacade::clearChecks()->checks([
        PassingCheck::new()->label('Database'),
        FailingCheck::new()->label('Disk space'),
    ]);

    alfakit()->setCurrentPanel(alfakit()->getPanel('health'));
});

it('registers the health page and the dashboard widget', function (): void {
    actingAs(healthUser());

    $panel = alfakit()->getPanel('health');

    expect($panel->hasPlugin('health'))->toBeTrue()
        ->and($panel->getPages())->toContain(Health::class)
        ->and($panel->getWidgets())->toContain(HealthStatusWidget::class)
        ->and(Health::getNavigationGroup())->toBe('System')
        ->and(Health::getNavigationSort())->toBe(9)
        ->and(Health::getNavigationIcon())->toBe('heart-pulse')
        ->and(Health::getNavigationLabel())->toBe('Health')
        ->and(Health::getNavigationItems())->toHaveCount(1);
});

it('shows an empty page before the checks ran', function (): void {
    actingAs(healthUser());

    $page = inertiaProps('/health-panel/health')['page'];
    $table = collect($page['content'])->firstWhere('type', 'Table');

    expect($page['title'])->toBe('Application health')
        ->and($page['subheading'])->toBe('The checks have not run yet.')
        ->and($table['records'])->toBe([])
        ->and($table['emptyState']['heading'])->toBe('No results yet')
        ->and(HealthCheckResultsWidget::make()->toSchema()['stats'])->toBe([]);
});

it('runs the checks from the refresh action and shows the results', function (): void {
    actingAs(healthUser());

    alfakit()->testPage(Health::class, panel: 'health')
        ->callAction('refresh')
        ->assertHasNoActionErrors()
        ->assertNotified('Health checks refreshed');

    expect(HealthResults::latest()?->storedCheckResults)->toHaveCount(2);

    $page = inertiaProps('/health-panel/health')['page'];
    $table = collect($page['content'])->firstWhere('type', 'Table');
    $rows = collect($table['records'])->map(fn (array $record): array => $record['cells']);

    expect($page['subheading'])->toStartWith('Checked ')
        ->and($table['pollingInterval'])->toBe('10s')
        ->and($rows->pluck('label.state')->all())->toEqualCanonicalizing(['Database', 'Disk space']);

    $disk = $rows->firstWhere('label.state', 'Disk space');
    $database = $rows->firstWhere('label.state', 'Database');

    expect($disk['status']['state'])->toBe('Failed')
        ->and($disk['status']['color'])->toBe('danger')
        ->and($disk['message']['state'])->toBe('Disk almost full')
        ->and($disk['summary']['state'])->toBe('95%')
        ->and($database['status']['state'])->toBe('OK')
        ->and($database['status']['color'])->toBe('success')
        ->and($database['meta']['state'])->toBe(['latency_ms: 12', 'cached: true']);
});

it('shows a stat card per check with its status colour', function (): void {
    actingAs(healthUser());
    HealthResults::run();

    $widget = HealthCheckResultsWidget::make()->toSchema();
    $stats = collect($widget['stats'])->keyBy('label');

    expect($widget['pollingInterval'])->toBe('10s')
        ->and($stats['Database']['value'])->toBe('Fast')
        ->and($stats['Database']['color'])->toBe('success')
        ->and($stats['Disk space']['value'])->toBe('95%')
        ->and($stats['Disk space']['description'])->toBe('Disk almost full')
        ->and($stats['Disk space']['color'])->toBe('danger');
});

it('summarises failures in the dashboard widget', function (): void {
    actingAs(healthUser());

    expect(HealthStatusWidget::make()->toSchema()['stats'][0])->toMatchArray(['value' => 'Not checked yet', 'color' => 'gray']);

    HealthResults::run();
    $stat = HealthStatusWidget::make()->toSchema()['stats'][0];

    expect($stat['label'])->toBe('Application health')
        ->and($stat['value'])->toBe('1 failing check')
        ->and($stat['description'])->toBe('Disk space')
        ->and($stat['color'])->toBe('danger')
        ->and($stat['url'])->toBe(Health::getUrl());

    FailingCheck::$status = 'warning';
    HealthResults::run();

    expect(HealthStatusWidget::make()->toSchema()['stats'][0])->toMatchArray(['value' => '1 warning', 'color' => 'warning']);

    FailingCheck::$status = 'ok';
    HealthResults::run();

    expect(HealthStatusWidget::make()->toSchema()['stats'][0])->toMatchArray(['value' => 'All checks passed', 'color' => 'success']);
});

it('renders the widget on the dashboard', function (): void {
    actingAs(healthUser());
    HealthResults::run();

    $response = inertiaGet('/health-panel');
    $response->assertOk();

    expect(json_encode($response->json('props')))->toContain('health-status-widget');
});

it('authorises the page, the refresh action and the widgets with the plugin closure', function (): void {
    actingAs($user = healthUser('Ada'));

    healthPlugin()->authorize(fn (mixed $user): bool => $user?->name === 'Root');

    inertiaGet('/health-panel/health')->assertForbidden();
    alfakit()->setCurrentPanel(alfakit()->getPanel('health'));

    expect(Health::getNavigationItems())->toBe([])
        ->and(HealthStatusWidget::canView())->toBeFalse()
        ->and(HealthCheckResultsWidget::canView())->toBeFalse();

    $user->update(['name' => 'Root']);

    inertiaGet('/health-panel/health')->assertOk();

    alfakit()->testPage(Health::class, panel: 'health')
        ->callAction('refresh')
        ->assertNotified('Health checks refreshed');
});

it('turns polling off and changes the navigation', function (): void {
    actingAs(healthUser());
    healthPlugin()->usingPollingInterval(null)->navigationLabel('Status')->navigationIcon('activity')->registerNavigation(false);

    $table = collect(inertiaProps('/health-panel/health')['page']['content'])->firstWhere('type', 'Table');
    alfakit()->setCurrentPanel(alfakit()->getPanel('health'));

    expect($table)->not->toHaveKey('pollingInterval')
        ->and(Health::getNavigationLabel())->toBe('Status')
        ->and(Health::getNavigationIcon())->toBe('activity')
        ->and(Health::getNavigationItems())->toBe([])
        ->and(HealthPlugin::make()->hasDashboardWidget())->toBeFalse();
});

it('translates the default labels of known checks and keeps custom ones', function (): void {
    app()->setLocale('de');

    expect(HealthResults::checkLabel('DebugMode', 'Debug Mode'))->toBe('Debug-Modus')
        ->and(HealthResults::checkLabel('UsedDiskSpace'))->toBe('Belegter Speicherplatz')
        // A label set with `->label()` and unknown checks are shown as they are.
        ->and(HealthResults::checkLabel('DebugMode', 'Production debug'))->toBe('Production debug')
        ->and(HealthResults::checkLabel('Passing', 'Database'))->toBe('Database')
        ->and(HealthResults::checkLabel('ThirdParty', 'Third Party'))->toBe('Third Party')
        ->and(HealthResults::checkLabel('ThirdParty'))->toBe('ThirdParty');

    app()->setLocale('en');
});
