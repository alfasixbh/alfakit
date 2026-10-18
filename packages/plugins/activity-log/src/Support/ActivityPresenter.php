<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitActivityLog\Support;

use AlfaSix\Alfakit\Resources\Resource as AlfakitResource;
use AlfaSix\Alfakit\Support\ModelLabel;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Stringable;
use Throwable;

/**
 * Turns activities into the labels, colours and rows the resource, the relation manager
 * and the timeline show. Every method is safe to call with a missing subject or causer.
 */
final class ActivityPresenter
{
    public static function eventLabel(?string $event): ?string
    {
        if ($event === null || $event === '') {
            return null;
        }

        $key = 'alfakit-activity-log::activity-log.events.'.$event;
        $label = __($key);

        return is_string($label) && $label !== $key ? $label : Str::headline($event);
    }

    public static function eventColor(?string $event): string
    {
        return match ($event) {
            'created' => 'success',
            'updated' => 'info',
            'deleted' => 'danger',
            'restored' => 'warning',
            default => 'gray',
        };
    }

    /**
     * The model label of a morph type (`App\Models\Post` → "Post").
     */
    public static function typeLabel(?string $type): ?string
    {
        if ($type === null || $type === '') {
            return null;
        }

        $class = Relation::getMorphedModel($type) ?? $type;

        if (class_exists($class) && is_subclass_of($class, Model::class)) {
            return Str::ucfirst(ModelLabel::singular($class));
        }

        return Str::headline(class_basename($class));
    }

    /**
     * "Post #12", or the title of the resource managing the model ("Post: Hello world").
     */
    public static function subjectLabel(Model $activity): ?string
    {
        $type = $activity->getAttribute('subject_type');
        $id = $activity->getAttribute('subject_id');

        if (! is_string($type) || $type === '') {
            return null;
        }

        $label = self::typeLabel($type);
        $subject = self::relatedModel($activity, 'subject');
        $resource = $subject !== null ? self::resourceFor($subject) : null;
        $title = $resource !== null && $resource::getRecordTitleAttribute() !== null ? $resource::getRecordTitle($subject) : null;

        return $title !== null && $title !== '' ? "{$label}: {$title}" : "{$label} #{$id}";
    }

    /**
     * A link to the subject's view or edit page, when a resource of the panel manages it.
     */
    public static function subjectUrl(Model $activity): ?string
    {
        $subject = self::relatedModel($activity, 'subject');

        if ($subject === null) {
            return null;
        }

        $resource = self::resourceFor($subject);

        if ($resource === null) {
            return null;
        }

        try {
            if ($resource::hasPage('view') && $resource::canView($subject)) {
                return $resource::getUrl('view', ['record' => $subject]);
            }

            if ($resource::hasPage('edit') && $resource::canEdit($subject)) {
                return $resource::getUrl('edit', ['record' => $subject]);
            }
        } catch (Throwable) {
            return null;
        }

        return null;
    }

    /**
     * The causer's name (or email, or key), or "System" without a causer.
     */
    public static function causerLabel(Model $activity): string
    {
        $causer = self::relatedModel($activity, 'causer');

        if ($causer === null) {
            $id = $activity->getAttribute('causer_id');

            return $id === null
                ? (string) __('alfakit-activity-log::activity-log.causer.system')
                : self::typeLabel((string) $activity->getAttribute('causer_type')).' #'.$id;
        }

        foreach (['name', 'full_name', 'email'] as $attribute) {
            $value = $causer->getAttribute($attribute);

            if (is_string($value) && $value !== '') {
                return $value;
            }
        }

        return self::typeLabel($causer->getMorphClass()).' #'.$causer->getKey();
    }

    /**
     * One row per changed attribute: `['attribute' => 'Title', 'old' => '…', 'new' => '…']`.
     *
     * @return array<int, array{key: string, attribute: string, old: ?string, new: ?string}>
     */
    public static function changeRows(Model $activity): array
    {
        $changes = self::toArray($activity->getAttribute('attribute_changes'));

        // Activities logged by v4 (or by hand) keep the changes in the properties.
        if ($changes === []) {
            $properties = self::toArray($activity->getAttribute('properties'));
            $changes = array_intersect_key($properties, array_flip(['attributes', 'old']));
        }

        $new = self::toArray($changes['attributes'] ?? []);
        $old = self::toArray($changes['old'] ?? []);
        $rows = [];

        foreach (array_unique([...array_keys($new), ...array_keys($old)]) as $key) {
            $key = (string) $key;
            $rows[] = [
                'key' => $key,
                'attribute' => Str::headline($key),
                'old' => array_key_exists($key, $old) ? self::formatValue($old[$key]) : null,
                'new' => array_key_exists($key, $new) ? self::formatValue($new[$key]) : null,
            ];
        }

        return $rows;
    }

    /**
     * The custom properties (without the changes and the plugin's own keys), as strings.
     *
     * @return array<string, string>
     */
    public static function propertyRows(Model $activity): array
    {
        $properties = self::toArray($activity->getAttribute('properties'));
        $hidden = ['attributes', 'old', ...TenantActivityScope::internalProperties()];
        $rows = [];

        foreach ($properties as $key => $value) {
            if (in_array((string) $key, $hidden, true)) {
                continue;
            }

            $rows[(string) $key] = (string) self::formatValue($value);
        }

        return $rows;
    }

    public static function formatValue(mixed $value): ?string
    {
        return match (true) {
            $value === null => null,
            is_bool($value) => $value ? 'true' : 'false',
            is_scalar($value) => (string) $value,
            $value instanceof Stringable => (string) $value,
            default => (string) json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        };
    }

    /**
     * @return array<array-key, mixed>
     */
    private static function toArray(mixed $value): array
    {
        return match (true) {
            $value instanceof Collection => $value->all(),
            is_array($value) => $value,
            is_string($value) => (array) (json_decode($value, true) ?? []),
            default => [],
        };
    }

    private static function relatedModel(Model $activity, string $relation): ?Model
    {
        if ($activity->getAttribute($relation.'_type') === null) {
            return null;
        }

        try {
            $related = $activity->getRelationValue($relation);
        } catch (Throwable) {
            return null;
        }

        return $related instanceof Model ? $related : null;
    }

    /**
     * @return class-string<AlfakitResource>|null
     */
    private static function resourceFor(Model $record): ?string
    {
        foreach (alfakit()->getCurrentOrDefaultPanel()->getResources() as $resource) {
            if ($resource::getModel() === $record::class) {
                return $resource;
            }
        }

        return null;
    }
}
