<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitTree\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Builds the nested node list of a set of records and saves a new structure posted by the
 * renderer.
 *
 * The renderer posts the tree as a flat list in display order, `[{key, parent}, …]`. Every
 * key and parent must be a record of the (tenant-scoped) query; records the list leaves out
 * keep their place. The resulting structure is checked for cycles and for the maximum
 * depth before anything is written, and all changes are saved in one transaction.
 */
final class TreeStructure
{
    /** The JSON action the renderer saves a new structure with. */
    public const REORDER_ACTION = 'treeReorder';

    private const ROOT = "\0root";

    /**
     * Records grouped as a tree: `[[record, children], …]` in order. Records whose parent
     * isn't among `$records` (or that sit in a cycle) become roots.
     *
     * @param  Collection<int, Model>  $records  Already sorted by the order column.
     * @return array<int, array{record: Model, children: array<mixed>}>
     */
    public static function nest(Collection $records, string $parentColumn): array
    {
        $byKey = [];
        $children = [];

        foreach ($records as $record) {
            $byKey[(string) $record->getKey()] = $record;
        }

        $parents = self::parentMap($byKey, $parentColumn);

        // Numeric keys become integer array keys: children lists hold strings.
        foreach (array_keys($byKey) as $key) {
            $parent = $parents[$key];
            $children[$parent ?? self::ROOT][] = (string) $key;
        }

        // Records in a cycle are never reached from a root: attach them as roots.
        $reached = [];
        $build = static function (string $slot) use (&$build, &$reached, $children, $byKey): array {
            $nodes = [];

            foreach ($children[$slot] ?? [] as $key) {
                if (isset($reached[$key])) {
                    continue;
                }

                $reached[$key] = true;
                $nodes[] = ['record' => $byKey[$key], 'children' => $build((string) $key)];
            }

            return $nodes;
        };

        $tree = $build(self::ROOT);

        foreach (array_keys($byKey) as $key) {
            if (! isset($reached[$key])) {
                $reached[$key] = true;
                $tree[] = ['record' => $byKey[$key], 'children' => $build((string) $key)];
            }
        }

        return $tree;
    }

    /**
     * Validate and save a posted structure. Returns the number of records changed.
     *
     * @param  Builder<Model>  $query  The records the user may arrange (tenant-scoped).
     * @param  mixed  $items  `[{key, parent}, …]` in display order.
     * @param  int|null  $maxDepth  Levels allowed (1 = a flat list); null for no limit.
     *
     * @throws ValidationException
     */
    public static function save(Builder $query, mixed $items, string $parentColumn, string $orderColumn, ?int $maxDepth = null): int
    {
        if (! is_array($items) || ! array_is_list($items)) {
            self::fail('invalid');
        }

        $records = [];

        foreach ((clone $query)->get() as $record) {
            $records[(string) $record->getKey()] = $record;
        }

        $moves = self::readMoves($items, $records);
        $parents = self::parentMap($records, $parentColumn);

        foreach ($moves as [$key, $parent]) {
            $parents[$key] = $parent;
        }

        self::ensureAcyclic($parents, $maxDepth);

        $positions = [];
        $counters = [];

        foreach ($moves as [$key, $parent]) {
            $slot = $parent ?? self::ROOT;
            $counters[$slot] = ($counters[$slot] ?? 0) + 1;
            $positions[$key] = $counters[$slot];
        }

        return DB::transaction(static function () use ($moves, $records, $positions, $parentColumn, $orderColumn): int {
            $changed = 0;

            foreach ($moves as [$key, $parent]) {
                $record = $records[$key];
                $parentValue = $parent === null ? null : $records[$parent]->getKey();
                $current = $record->getAttribute($parentColumn);

                $sameParent = $current === null ? $parentValue === null : $parentValue !== null && (string) $current === (string) $parentValue;

                if ($sameParent && (int) $record->getAttribute($orderColumn) === $positions[$key]) {
                    continue;
                }

                $record->setAttribute($parentColumn, $parentValue);
                $record->setAttribute($orderColumn, $positions[$key]);
                $record->save();
                $changed++;
            }

            return $changed;
        });
    }

    /**
     * @param  array<mixed>  $items
     * @param  array<string, Model>  $records
     * @return array<int, array{0: string, 1: string|null}>
     */
    private static function readMoves(array $items, array $records): array
    {
        $moves = [];
        $seen = [];

        foreach ($items as $item) {
            if (! is_array($item)) {
                self::fail('invalid');
            }

            $key = self::key($item['key'] ?? null);
            $parent = $item['parent'] ?? null;
            $parent = $parent === null || $parent === '' ? null : self::key($parent);

            if ($key === null || ! isset($records[$key])) {
                self::fail('unknown_record');
            }

            if (isset($seen[$key])) {
                self::fail('duplicate_record');
            }

            if ($parent !== null && ! isset($records[$parent])) {
                self::fail('unknown_parent');
            }

            $seen[$key] = true;
            $moves[] = [$key, $parent];
        }

        return $moves;
    }

    /**
     * Each record's parent key (null for roots and for parents outside the set).
     *
     * @param  array<string, Model>  $records
     * @return array<string, string|null>
     */
    private static function parentMap(array $records, string $parentColumn): array
    {
        $parents = [];

        foreach ($records as $key => $record) {
            $parent = $record->getAttribute($parentColumn);
            $parent = is_int($parent) || is_string($parent) ? (string) $parent : null;
            $parents[(string) $key] = $parent !== null && isset($records[$parent]) ? $parent : null;
        }

        return $parents;
    }

    /**
     * @param  array<string, string|null>  $parents
     *
     * @throws ValidationException
     */
    private static function ensureAcyclic(array $parents, ?int $maxDepth): void
    {
        foreach (array_keys($parents) as $key) {
            $chain = [$key => true];
            $depth = 1;
            $parent = $parents[$key];

            while ($parent !== null) {
                if (isset($chain[$parent])) {
                    self::fail('cycle');
                }

                $chain[$parent] = true;
                $depth++;
                $parent = $parents[$parent] ?? null;
            }

            if ($maxDepth !== null && $maxDepth > 0 && $depth > $maxDepth) {
                throw ValidationException::withMessages(['tree' => __('alfakit-tree::tree.validation.max_depth', ['depth' => $maxDepth])]);
            }
        }
    }

    private static function key(mixed $value): ?string
    {
        return is_int($value) || (is_string($value) && $value !== '') ? (string) $value : null;
    }

    /**
     * @throws ValidationException
     */
    private static function fail(string $reason): never
    {
        throw ValidationException::withMessages(['tree' => __('alfakit-tree::tree.validation.'.$reason)]);
    }
}
