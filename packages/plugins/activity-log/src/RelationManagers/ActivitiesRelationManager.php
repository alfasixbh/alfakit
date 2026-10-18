<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitActivityLog\RelationManagers;

use AlfaSix\Alfakit\Actions\ViewAction;
use AlfaSix\Alfakit\Resources\RelationManagers\RelationManager;
use AlfaSix\Alfakit\Tables\Table;
use AlfaSix\AlfakitActivityLog\ActivityLogPlugin;
use AlfaSix\AlfakitActivityLog\Support\ActivitySchema;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Relation;
use Spatie\Activitylog\Support\Config;

/**
 * The activities of the record (as subject), newest first, on any resource whose model
 * uses `LogsActivity`:
 *
 * ```php
 * public static function getRelations(): array
 * {
 *     return [ActivitiesRelationManager::class];
 * }
 * ```
 */
class ActivitiesRelationManager extends RelationManager
{
    protected static string $relationship = 'activitiesAsSubject';

    protected static ?string $icon = 'history';

    public static function getTitle(): string
    {
        return static::$title ?? (string) __('alfakit-activity-log::activity-log.relation_manager.title');
    }

    public static function canViewForRecord(Model $ownerRecord, string $pageClass): bool
    {
        $plugin = ActivityLogPlugin::get();

        return ! $plugin->hasAuthorization() || $plugin->isAuthorized();
    }

    public function getModelLabel(): string
    {
        return ActivityLogPlugin::get()->getLabel();
    }

    public function getPluralModelLabel(): string
    {
        return ActivityLogPlugin::get()->getPluralLabel();
    }

    /**
     * `activitiesAsSubject()` (`LogsActivity`), `activities()` (`HasActivity`), or the
     * subject morph relation itself for models that are logged without the trait.
     */
    public function getRelationship(): Relation
    {
        $owner = $this->getOwnerRecord();

        foreach (array_unique([static::getRelationshipName(), 'activitiesAsSubject', 'activities']) as $name) {
            if (method_exists($owner, $name)) {
                $relationship = $owner->{$name}();

                if ($relationship instanceof Relation) {
                    return $relationship;
                }
            }
        }

        return $owner->morphMany(Config::activityModel(), 'subject');
    }

    public function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(static fn ($query) => $query->with('causer'))
            ->columns(ActivitySchema::columns(withSubject: false))
            ->filters(ActivitySchema::filters(withSubject: false))
            ->recordActions([
                ViewAction::make()->modalContent(static fn (): array => ActivitySchema::infolist()),
            ])
            ->defaultSort('created_at', 'desc')
            ->emptyStateHeading(__('alfakit-activity-log::activity-log.empty.heading'))
            ->emptyStateDescription(__('alfakit-activity-log::activity-log.empty.description'));
    }
}
