<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitActivityLog\Resources;

use AlfaSix\Alfakit\Actions\ViewAction;
use AlfaSix\Alfakit\Resources\Resource;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Tables\Table;
use AlfaSix\AlfakitActivityLog\ActivityLogPlugin;
use AlfaSix\AlfakitActivityLog\Resources\ActivityResource\Pages;
use AlfaSix\AlfakitActivityLog\Support\ActivitySchema;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Support\Config;

/**
 * Lists the activity log and shows each activity with its old → new changes. Read only:
 * activities are never created, edited or deleted from the panel.
 *
 * Extend it and pass your class to `ActivityLogPlugin::make()->resourceClass(...)` to
 * change the table or the infolist.
 */
class ActivityResource extends Resource
{
    protected static ?string $slug = 'activity-log';

    protected static bool $isScopedToTenant = false;

    protected static bool $isGloballySearchable = false;

    protected static bool $isDiscovered = false;

    public static function getModel(): string
    {
        /** @var class-string<Model> */
        return Config::activityModel();
    }

    public static function getPlugin(): ActivityLogPlugin
    {
        return ActivityLogPlugin::get();
    }

    public static function getModelLabel(): string
    {
        return static::getPlugin()->getLabel();
    }

    public static function getPluralModelLabel(): string
    {
        return static::getPlugin()->getPluralLabel();
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

    public static function getNavigationBadge(): string|int|null
    {
        return static::getPlugin()->hasNavigationCountBadge() ? static::getEloquentQuery()->count() : null;
    }

    public static function getEloquentQuery(): Builder
    {
        return static::getPlugin()->applyTenantScope(parent::getEloquentQuery()->with(['causer', 'subject']));
    }

    // ---------------------------------------------------------------- Authorisation

    public static function canViewAny(): bool
    {
        $plugin = static::getPlugin();

        return $plugin->hasAuthorization() ? $plugin->isAuthorized() : parent::canViewAny();
    }

    public static function canView(Model $record): bool
    {
        $plugin = static::getPlugin();

        return $plugin->hasAuthorization() ? $plugin->isAuthorized() : parent::canView($record);
    }

    public static function canCreate(): bool
    {
        return false;
    }

    public static function canEdit(Model $record): bool
    {
        return false;
    }

    public static function canDelete(Model $record): bool
    {
        return false;
    }

    public static function canDeleteAny(): bool
    {
        return false;
    }

    // ---------------------------------------------------------------- Definition

    public static function infolist(Schema $schema): Schema
    {
        return $schema->components(ActivitySchema::infolist());
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns(ActivitySchema::columns())
            ->filters(ActivitySchema::filters())
            ->recordActions([ViewAction::make()])
            ->defaultSort('created_at', 'desc')
            ->emptyStateHeading(__('alfakit-activity-log::activity-log.empty.heading'))
            ->emptyStateDescription(__('alfakit-activity-log::activity-log.empty.description'));
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListActivities::route('/'),
            'view' => Pages\ViewActivity::route('/{record}'),
        ];
    }
}
