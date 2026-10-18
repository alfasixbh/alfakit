<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitActivityLog\Infolists\Components;

use AlfaSix\Alfakit\Infolists\Components\RepeatableEntry;
use AlfaSix\Alfakit\Infolists\Components\TextEntry;
use AlfaSix\AlfakitActivityLog\Support\ActivityPresenter;
use AlfaSix\AlfakitActivityLog\Support\ActivitySchema;
use Closure;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Spatie\Activitylog\Support\Config;

/**
 * The record's activities as a timeline in an infolist, newest first: event, who did it,
 * when, and the old → new changes. Built from `RepeatableEntry`, so it renders in every
 * renderer without extra frontend code.
 *
 * ```php
 * ActivityLogTimelineEntry::make()->limit(20)->columnSpanFull()
 * ```
 */
class ActivityLogTimelineEntry extends RepeatableEntry
{
    /** Rendered by the renderers' `RepeatableEntry`: no frontend code of its own. */
    protected ?string $type = 'RepeatableEntry';

    protected int|Closure|null $limit = 10;

    protected ?Closure $modifyQueryUsing = null;

    protected bool|Closure $showsChanges = true;

    public static function make(mixed ...$arguments): static
    {
        return parent::make(...($arguments === [] ? ['activities'] : $arguments));
    }

    protected function setUp(): void
    {
        parent::setUp();

        $this->label(__('alfakit-activity-log::activity-log.timeline.label'));
        $this->placeholder(__('alfakit-activity-log::activity-log.timeline.empty'));
        $this->columns(['default' => 1, 'md' => 3]);

        $this->getStateUsing(fn (?Model $record): Collection => $record === null ? collect() : $this->getActivities($record));

        $this->schema(fn (): array => [
            TextEntry::make('summary')
                ->hiddenLabel()
                ->weight('semibold')
                ->getStateUsing(static fn (Model $record): string => (string) __('alfakit-activity-log::activity-log.timeline.entry', [
                    'event' => ActivityPresenter::eventLabel($record->getAttribute('event')) ?? (string) $record->getAttribute('description'),
                    'causer' => ActivityPresenter::causerLabel($record),
                ]))
                ->columnSpan(['default' => 1, 'md' => 2]),
            TextEntry::make('created_at')
                ->hiddenLabel()
                ->since()
                ->dateTimeTooltip()
                ->alignEnd(),
            TextEntry::make('description')
                ->hiddenLabel()
                ->color('gray')
                ->visible(static fn (Model $record): bool => $record->getAttribute('description') !== $record->getAttribute('event'))
                ->columnSpanFull(),
            ActivitySchema::changesEntry('changes')
                ->visible(fn (Model $record): bool => (bool) $this->evaluate($this->showsChanges) && ActivityPresenter::changeRows($record) !== [])
                ->columnSpanFull(),
        ]);
    }

    /**
     * How many activities to show (newest first); null for all of them.
     */
    public function limit(int|Closure|null $limit): static
    {
        $this->limit = $limit;

        return $this;
    }

    /**
     * Change the query, e.g. `fn (Builder $query) => $query->inLog('orders')`.
     */
    public function modifyQueryUsing(?Closure $callback): static
    {
        $this->modifyQueryUsing = $callback;

        return $this;
    }

    public function showChanges(bool|Closure $condition = true): static
    {
        $this->showsChanges = $condition;

        return $this;
    }

    /**
     * @return Collection<int, Model>
     */
    public function getActivities(Model $record): Collection
    {
        /** @var class-string<Model> $model */
        $model = Config::activityModel();

        $query = $model::query()
            ->where('subject_type', $record->getMorphClass())
            ->where('subject_id', $record->getKey())
            ->with('causer')
            ->latest()
            ->orderByDesc((new $model)->getKeyName());

        if ($this->modifyQueryUsing !== null) {
            $result = $this->evaluate($this->modifyQueryUsing, ['query' => $query], [Builder::class => $query]);
            $query = $result instanceof Builder ? $result : $query;
        }

        $limit = $this->evaluate($this->limit);

        if (is_int($limit)) {
            $query->limit($limit);
        }

        return $query->get();
    }
}
