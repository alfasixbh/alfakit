<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitBackup\Pages;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Forms\Components\Radio;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Pages\Page;
use AlfaSix\Alfakit\Panel;
use AlfaSix\Alfakit\Support\NumberFormat;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Filters\SelectFilter;
use AlfaSix\Alfakit\Tables\Table;
use AlfaSix\AlfakitBackup\BackupPlugin;
use AlfaSix\AlfakitBackup\Http\Controllers\DownloadBackupController;
use AlfaSix\AlfakitBackup\Jobs\CreateBackupJob;
use AlfaSix\AlfakitBackup\Support\BackupOption;
use AlfaSix\AlfakitBackup\Support\BackupRepository;
use AlfaSix\AlfakitBackup\Widgets\BackupDestinationsWidget;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\URL;

/**
 * Lists the backups of every destination disk with the destinations' health, and creates
 * (in the background), downloads and deletes backups.
 *
 * Extend it and pass your class to `BackupPlugin::make()->usingPage(...)` to change it.
 */
class Backups extends Page
{
    protected static ?string $slug = 'backups';

    protected static bool $isDiscovered = false;

    public static function getPlugin(): BackupPlugin
    {
        return BackupPlugin::get();
    }

    public static function canAccess(): bool
    {
        return static::getPlugin()->isAuthorized();
    }

    public function getTitle(): string
    {
        return (string) __('alfakit-backup::backup.page.title');
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

    /**
     * The page, plus `{page}/download`: a signed route that streams a backup.
     */
    public static function registerRoutes(Panel $panel): void
    {
        parent::registerRoutes($panel);

        Route::get(static::getClusterRoutePrefix().ltrim(static::getRoutePath(), '/').'/download', DownloadBackupController::class)
            ->name(static::getRelativeRouteName().'.download')
            ->middleware('signed');
    }

    /**
     * A temporary signed link that downloads the backup at `$path` on `$disk`.
     */
    public static function getDownloadUrl(string $disk, string $path): string
    {
        $panel = alfakit()->getCurrentOrDefaultPanel();
        $parameters = ['disk' => $disk, 'path' => $path];
        $tenant = $panel->hasTenancy() ? alfakit()->getTenant() : null;

        if ($tenant !== null) {
            $parameters['tenant'] = $panel->getTenantRouteKey($tenant);
        }

        return URL::temporarySignedRoute(
            $panel->generateRouteName(static::getRelativeRouteName().'.download'),
            now()->addMinutes(static::getPlugin()->getDownloadLinkLifetime()),
            $parameters,
        );
    }

    protected function getHeaderActions(): array
    {
        return [$this->getCreateBackupAction()];
    }

    protected function getCreateBackupAction(): Action
    {
        return Action::make('create')
            ->label(__('alfakit-backup::backup.actions.create.label'))
            ->icon('plus')
            ->button()
            ->modalHeading(__('alfakit-backup::backup.actions.create.modal_heading'))
            ->modalDescription(__('alfakit-backup::backup.actions.create.modal_description'))
            ->modalSubmitActionLabel(__('alfakit-backup::backup.actions.create.submit'))
            ->form([
                Radio::make('option')
                    ->label(__('alfakit-backup::backup.actions.create.option'))
                    ->options(BackupOption::options())
                    ->default(BackupOption::All->value)
                    ->required(),
            ])
            ->authorize(static fn (): bool => static::getPlugin()->isAuthorized())
            ->action(static function (array $data): void {
                $plugin = static::getPlugin();
                $option = BackupOption::tryFrom((string) ($data['option'] ?? '')) ?? BackupOption::All;

                CreateBackupJob::dispatch($option, $plugin->getTimeout())
                    ->onQueue($plugin->getQueue())
                    ->onConnection($plugin->getConnection());

                Notification::make()
                    ->success()
                    ->title(__('alfakit-backup::backup.actions.create.notification'))
                    ->send();
            });
    }

    protected function getHeaderWidgets(): array
    {
        return [BackupDestinationsWidget::class];
    }

    public function table(Table $table): Table
    {
        return $table
            ->heading(__('alfakit-backup::backup.table.heading'))
            ->records(static fn (): array => BackupRepository::backups())
            ->columns([
                TextColumn::make('name')
                    ->label(__('alfakit-backup::backup.table.columns.name'))
                    ->description(static fn (array $record): string => $record['path'])
                    ->searchable(),
                TextColumn::make('disk')
                    ->label(__('alfakit-backup::backup.table.columns.disk'))
                    ->badge()
                    ->color('gray'),
                TextColumn::make('date')
                    ->label(__('alfakit-backup::backup.table.columns.date'))
                    ->dateTime()
                    ->sortable(),
                TextColumn::make('size')
                    ->label(__('alfakit-backup::backup.table.columns.size'))
                    ->formatStateUsing(static fn (mixed $state): string => NumberFormat::fileSize(is_numeric($state) ? (int) $state : 0, 2))
                    ->sortable(),
            ])
            ->filters([
                SelectFilter::make('disk')
                    ->label(__('alfakit-backup::backup.table.filters.disk'))
                    ->options(static fn (): array => array_combine($disks = array_keys(BackupRepository::destinations()), $disks)),
            ])
            ->recordActions([
                Action::make('download')
                    ->label(__('alfakit-backup::backup.actions.download.label'))
                    ->icon('download')
                    ->color('gray')
                    ->url(static fn (array $record): string => static::getDownloadUrl($record['disk'], $record['path'])),
                Action::make('delete')
                    ->label(__('alfakit-backup::backup.actions.delete.label'))
                    ->icon('trash-2')
                    ->color('danger')
                    ->requiresConfirmation()
                    ->modalHeading(__('alfakit-backup::backup.actions.delete.modal_heading'))
                    ->modalDescription(static fn (array $record): string => (string) __('alfakit-backup::backup.actions.delete.modal_description', ['name' => $record['name']]))
                    ->modalSubmitActionLabel(__('alfakit-backup::backup.actions.delete.submit'))
                    ->authorize(static fn (): bool => static::getPlugin()->isAuthorized())
                    ->action(static function (array $record): void {
                        BackupRepository::find($record['disk'], $record['path'])?->delete();

                        Notification::make()
                            ->success()
                            ->title(__('alfakit-backup::backup.actions.delete.notification'))
                            ->send();
                    }),
            ])
            ->defaultSort('date', 'desc')
            ->poll(static::getPlugin()->getPollingInterval())
            ->emptyStateHeading(__('alfakit-backup::backup.table.empty.heading'))
            ->emptyStateDescription(__('alfakit-backup::backup.table.empty.description'));
    }
}
