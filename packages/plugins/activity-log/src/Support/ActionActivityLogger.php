<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitActivityLog\Support;

use AlfaSix\Alfakit\Actions\CreateAction;
use AlfaSix\Alfakit\Actions\DeleteAction;
use AlfaSix\Alfakit\Actions\DeleteBulkAction;
use AlfaSix\Alfakit\Actions\EditAction;
use AlfaSix\AlfakitActivityLog\ActivityLogPlugin;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Enumerable;
use Spatie\Activitylog\Contracts\Activity;
use Spatie\Activitylog\Models\Concerns\LogsActivity;

/**
 * Logs activities for AlfaKit's create, edit and delete actions (`ActivityLogPlugin::logActions()`)
 * and resource pages (`LogsAlfakitActions`), for models that don't use `LogsActivity`.
 */
final class ActionActivityLogger
{
    /** Attributes left out of the logged changes. */
    private const IGNORED_ATTRIBUTES = ['created_at', 'updated_at', 'password', 'remember_token'];

    private static bool $registered = false;

    /**
     * Hook the prebuilt actions (once per process). The hooks only log on panels where the
     * plugin is registered with `logActions()`.
     */
    public static function register(): void
    {
        if (self::$registered) {
            return;
        }

        self::$registered = true;

        CreateAction::configureUsing(static fn (CreateAction $action) => $action->after(static function (mixed $result): void {
            if ($result instanceof Model && self::isEnabled()) {
                self::log('created', $result);
            }
        }));

        EditAction::configureUsing(static fn (EditAction $action) => $action->after(static function (?Model $record): void {
            if ($record !== null && self::isEnabled()) {
                self::log('updated', $record);
            }
        }));

        DeleteAction::configureUsing(static fn (DeleteAction $action) => $action->after(static function (?Model $record): void {
            if ($record !== null && self::isEnabled()) {
                self::log('deleted', $record);
            }
        }));

        DeleteBulkAction::configureUsing(static fn (DeleteBulkAction $action) => $action->after(static function (mixed $records): void {
            if (! $records instanceof Enumerable || ! self::isEnabled()) {
                return;
            }

            foreach ($records as $record) {
                if ($record instanceof Model) {
                    self::log('deleted', $record);
                }
            }
        }));
    }

    private static function isEnabled(): bool
    {
        return ActivityLogPlugin::get()->logsActions();
    }

    /**
     * Log `$event` (`created`, `updated`, `deleted`) for `$record`, with its changes. Models
     * that use `LogsActivity` are skipped: they log themselves.
     *
     * @param  array{attributes?: array<string, mixed>, old?: array<string, mixed>}|null  $changes
     */
    public static function log(string $event, Model $record, ?array $changes = null, bool $force = false): ?Activity
    {
        if (! $force && in_array(LogsActivity::class, class_uses_recursive($record), true)) {
            return null;
        }

        $changes ??= self::changesFor($event, $record);

        if ($event === 'updated' && ($changes['attributes'] ?? []) === []) {
            return null;
        }

        return activity()
            ->performedOn($record)
            ->event($event)
            ->withChanges($changes)
            ->log($event);
    }

    /**
     * @return array{attributes?: array<string, mixed>, old?: array<string, mixed>}
     */
    public static function changesFor(string $event, Model $record): array
    {
        $hidden = [...self::IGNORED_ATTRIBUTES, ...$record->getHidden()];

        return match ($event) {
            'created' => ['attributes' => self::without($record->attributesToArray(), $hidden)],
            'updated' => [
                'attributes' => $attributes = self::without(array_intersect_key($record->attributesToArray(), $record->getChanges()), $hidden),
                'old' => array_intersect_key($record->getPrevious(), $attributes),
            ],
            'deleted' => ['old' => self::without($record->attributesToArray(), $hidden)],
            default => [],
        };
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @param  array<string>  $keys
     * @return array<string, mixed>
     */
    private static function without(array $attributes, array $keys): array
    {
        return array_diff_key($attributes, array_flip($keys));
    }
}
