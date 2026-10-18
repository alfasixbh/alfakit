<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitActivityLog\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\Relation;
use Spatie\Activitylog\Actions\LogActivityAction;

/**
 * Which activities belong to a tenant. An activity is in the tenant's log when:
 *
 * - it was logged during a request to the tenant (the plugin stores the tenant in its
 *   properties, see `ActivityLogPlugin::recordTenant()`), or
 * - its subject is the tenant itself, or
 * - its subject belongs to the tenant through the panel's tenant ownership relationship.
 */
final class TenantActivityScope
{
    public const TENANT_TYPE_PROPERTY = 'alfakit_tenant_type';

    public const TENANT_ID_PROPERTY = 'alfakit_tenant_id';

    private static bool $recorderRegistered = false;

    /**
     * @template TModel of Model
     *
     * @param  Builder<TModel>  $query
     * @return Builder<TModel>
     */
    public static function apply(Builder $query, Model $tenant, string $ownershipRelationship): Builder
    {
        $tenantType = $tenant->getMorphClass();
        $tenantKey = $tenant->getKey();
        $ownedTypes = self::tenantOwnedSubjectTypes($query, $ownershipRelationship);

        return $query->where(static function (Builder $query) use ($tenantType, $tenantKey, $ownedTypes, $ownershipRelationship, $tenant): void {
            $query
                ->where(static fn (Builder $query) => $query
                    ->where('properties->'.self::TENANT_TYPE_PROPERTY, $tenantType)
                    ->where('properties->'.self::TENANT_ID_PROPERTY, $tenantKey))
                ->orWhere(static fn (Builder $query) => $query
                    ->where('subject_type', $tenantType)
                    ->where('subject_id', $tenantKey));

            if ($ownedTypes !== []) {
                $query->orWhereHasMorph('subject', $ownedTypes, static function (Builder $query) use ($ownershipRelationship, $tenant): void {
                    $relationship = $query->getModel()->{$ownershipRelationship}();

                    if ($relationship instanceof BelongsTo) {
                        $query->where($relationship->getQualifiedForeignKeyName(), $tenant->getKey());

                        return;
                    }

                    $query->whereHas($ownershipRelationship, static fn (Builder $query) => $query->whereKey($tenant->getKey()));
                });
            }
        });
    }

    /**
     * Subject types in the log whose model has the tenant ownership relationship.
     *
     * @param  Builder<covariant Model>  $query
     * @return array<string>
     */
    private static function tenantOwnedSubjectTypes(Builder $query, string $ownershipRelationship): array
    {
        $types = $query->getModel()->newQuery()->whereNotNull('subject_type')->distinct()->pluck('subject_type')->all();

        return array_values(array_filter($types, static function (mixed $type) use ($ownershipRelationship): bool {
            if (! is_string($type)) {
                return false;
            }

            $class = Relation::getMorphedModel($type) ?? $type;

            return class_exists($class) && is_subclass_of($class, Model::class) && method_exists($class, $ownershipRelationship);
        }));
    }

    /**
     * Store the current tenant in every activity logged while a tenant is active.
     */
    public static function registerTenantRecorder(): void
    {
        if (self::$recorderRegistered) {
            return;
        }

        self::$recorderRegistered = true;

        LogActivityAction::beforeLogging(static function (mixed $activity): void {
            if (! $activity instanceof Model) {
                return;
            }

            $tenant = alfakit()->getTenant();

            if ($tenant === null) {
                return;
            }

            $properties = collect($activity->getAttribute('properties') ?? []);

            if ($properties->has(self::TENANT_ID_PROPERTY)) {
                return;
            }

            $activity->setAttribute('properties', $properties
                ->put(self::TENANT_TYPE_PROPERTY, $tenant->getMorphClass())
                ->put(self::TENANT_ID_PROPERTY, $tenant->getKey()));
        });
    }

    /**
     * The properties the plugin adds itself (hidden from the properties list).
     *
     * @return array<string>
     */
    public static function internalProperties(): array
    {
        return [self::TENANT_TYPE_PROPERTY, self::TENANT_ID_PROPERTY];
    }
}
