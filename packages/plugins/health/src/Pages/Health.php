<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitHealth\Pages;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Pages\Page;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Table;
use AlfaSix\AlfakitHealth\HealthPlugin;
use AlfaSix\AlfakitHealth\Support\HealthResults;
use AlfaSix\AlfakitHealth\Widgets\HealthCheckResultsWidget;
use Carbon\CarbonImmutable;

/**
 * The latest spatie/laravel-health results: a card per check, a table with each check's
 * message and meta, and a "refresh" action that runs the checks.
 *
 * Extend it and pass your class to `HealthPlugin::make()->usingPage(...)` to change it.
 */
class Health extends Page
{
    protected static ?string $slug = 'health';

    protected static bool $isDiscovered = false;

    public static function getPlugin(): HealthPlugin
    {
        return HealthPlugin::get();
    }

    public static function canAccess(): bool
    {
        return static::getPlugin()->isAuthorized();
    }

    public function getTitle(): string
    {
        return (string) __('alfakit-health::health.page.title');
    }

    public function getSubheading(): ?string
    {
        $finishedAt = HealthResults::latest()?->finishedAt;

        return $finishedAt === null
            ? (string) __('alfakit-health::health.page.never_ran')
            : (string) __('alfakit-health::health.page.last_ran', ['time' => CarbonImmutable::instance($finishedAt)->diffForHumans()]);
    }

    public static function getNavigationLabel(): string
    {
        return static::getPlugin()->getNavigationLabel();
    }

    public static function getNavigationGroup(): ?string
    {
        return static::getPlugin()->getNavigationGroup();
    }

    public static function getNavigationIcon(): ?string
    {
        return static::getPlugin()->getNavigationIcon();
    }

    public static function getNavigationSort(): ?int
    {
        return static::getPlugin()->getNavigationSort();
    }

    public static function shouldRegisterNavigation(): bool
    {
        return static::getPlugin()->shouldRegisterNavigation();
    }

    protected function getHeaderActions(): array
    {
        return [
            Action::make('refresh')
                ->label(__('alfakit-health::health.actions.refresh.label'))
                ->icon('refresh-cw')
                ->button()
                ->authorize(static fn (): bool => static::getPlugin()->isAuthorized())
                ->action(static function (): void {
                    HealthResults::run(notify: static::getPlugin()->sendsNotificationsOnRefresh());

                    Notification::make()
                        ->success()
                        ->title(__('alfakit-health::health.actions.refresh.notification'))
                        ->send();
                }),
        ];
    }

    protected function getHeaderWidgets(): array
    {
        return [HealthCheckResultsWidget::class];
    }

    public function table(Table $table): Table
    {
        return $table
            ->heading(__('alfakit-health::health.results.details'))
            ->records(static fn (): array => HealthResults::rows())
            ->columns([
                TextColumn::make('label')
                    ->label(__('alfakit-health::health.results.columns.check'))
                    ->weight('medium'),
                TextColumn::make('status')
                    ->label(__('alfakit-health::health.results.columns.status'))
                    ->badge()
                    ->formatStateUsing(static fn (?string $state): string => HealthResults::statusLabel($state))
                    ->color(static fn (?string $state): string => HealthResults::statusColor($state))
                    ->icon(static fn (?string $state): string => HealthResults::statusIcon($state)),
                TextColumn::make('summary')
                    ->label(__('alfakit-health::health.results.columns.summary')),
                TextColumn::make('message')
                    ->label(__('alfakit-health::health.results.columns.message'))
                    ->wrap(),
                TextColumn::make('meta')
                    ->label(__('alfakit-health::health.results.columns.meta'))
                    ->getStateUsing(static fn (array $record): array => HealthResults::metaLines($record['meta']))
                    ->listWithLineBreaks(),
            ])
            ->paginated(false)
            ->poll(static::getPlugin()->getPollingInterval())
            ->emptyStateHeading(__('alfakit-health::health.results.empty.heading'))
            ->emptyStateDescription(__('alfakit-health::health.results.empty.description'));
    }
}
