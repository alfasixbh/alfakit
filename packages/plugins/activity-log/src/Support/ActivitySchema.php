<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitActivityLog\Support;

use AlfaSix\Alfakit\Forms\Components\DatePicker;
use AlfaSix\Alfakit\Infolists\Components\KeyValueEntry;
use AlfaSix\Alfakit\Infolists\Components\RepeatableEntry;
use AlfaSix\Alfakit\Infolists\Components\RepeatableEntry\TableColumn;
use AlfaSix\Alfakit\Infolists\Components\TextEntry;
use AlfaSix\Alfakit\Schemas\Components\Component;
use AlfaSix\Alfakit\Schemas\Components\Section;
use AlfaSix\Alfakit\Tables\Columns\Column;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Filters\BaseFilter;
use AlfaSix\Alfakit\Tables\Filters\Filter;
use AlfaSix\Alfakit\Tables\Filters\SelectFilter;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Spatie\Activitylog\Support\Config;

/**
 * The columns, filters and entries shared by the activity resource, the relation manager
 * and the timeline. Use them in your own resources too.
 */
final class ActivitySchema
{
    private static function trans(string $key): string
    {
        return (string) __('alfakit-activity-log::activity-log.'.$key);
    }

    // ---------------------------------------------------------------- Table

    /**
     * @return array<Column>
     */
    public static function columns(bool $withSubject = true): array
    {
        return array_values(array_filter([
            TextColumn::make('log_name')
                ->label(self::trans('fields.log_name'))
                ->badge()
                ->color('gray')
                ->toggleable(),
            TextColumn::make('event')
                ->label(self::trans('fields.event'))
                ->badge()
                ->formatStateUsing(static fn (?string $state): ?string => ActivityPresenter::eventLabel($state))
                ->color(static fn (?string $state): string => ActivityPresenter::eventColor($state)),
            TextColumn::make('description')
                ->label(self::trans('fields.description'))
                ->searchable()
                ->limit(60)
                ->wrap(),
            $withSubject ? TextColumn::make('subject_type')
                ->label(self::trans('fields.subject'))
                ->getStateUsing(static fn (Model $record): ?string => ActivityPresenter::subjectLabel($record))
                ->url(static fn (Model $record): ?string => ActivityPresenter::subjectUrl($record)) : null,
            TextColumn::make('causer_id')
                ->label(self::trans('fields.causer'))
                ->getStateUsing(static fn (Model $record): string => ActivityPresenter::causerLabel($record)),
            TextColumn::make('created_at')
                ->label(self::trans('fields.created_at'))
                ->dateTime()
                ->sortable(),
        ]));
    }

    /**
     * @return array<BaseFilter>
     */
    public static function filters(bool $withSubject = true): array
    {
        return array_values(array_filter([
            SelectFilter::make('log_name')
                ->label(self::trans('fields.log_name'))
                ->options(static fn (): array => self::distinctOptions('log_name')),
            SelectFilter::make('event')
                ->label(self::trans('fields.event'))
                ->options(static fn (): array => array_map(
                    static fn (string $event): string => (string) ActivityPresenter::eventLabel($event),
                    self::distinctOptions('event'),
                )),
            SelectFilter::make('causer')
                ->label(self::trans('fields.causer'))
                ->options(static fn (): array => self::causerOptions())
                ->searchable()
                ->query(static function (Builder $query, array $data): Builder {
                    $value = $data['value'] ?? null;

                    if (! is_string($value) || ! str_contains($value, '|')) {
                        return $query;
                    }

                    [$type, $id] = explode('|', $value, 2);

                    return $query->where('causer_type', $type)->where('causer_id', $id);
                }),
            $withSubject ? SelectFilter::make('subject_type')
                ->label(self::trans('fields.subject_type'))
                ->options(static fn (): array => array_map(
                    static fn (string $type): string => (string) ActivityPresenter::typeLabel($type),
                    self::distinctOptions('subject_type'),
                )) : null,
            Filter::make('created_at')
                ->label(self::trans('fields.created_at'))
                ->form([
                    DatePicker::make('created_from')->label(self::trans('fields.created_from')),
                    DatePicker::make('created_until')->label(self::trans('fields.created_until')),
                ])
                ->query(static fn (Builder $query, array $data): Builder => $query
                    ->when($data['created_from'] ?? null, static fn (Builder $query, mixed $date): Builder => $query->whereDate('created_at', '>=', Carbon::parse((string) $date)))
                    ->when($data['created_until'] ?? null, static fn (Builder $query, mixed $date): Builder => $query->whereDate('created_at', '<=', Carbon::parse((string) $date))))
                ->indicateUsing(static fn (array $data): array => array_values(array_filter([
                    ($data['created_from'] ?? null) ? __('alfakit-activity-log::activity-log.filters.created_from_indicator', ['date' => $data['created_from']]) : null,
                    ($data['created_until'] ?? null) ? __('alfakit-activity-log::activity-log.filters.created_until_indicator', ['date' => $data['created_until']]) : null,
                ]))),
        ]));
    }

    /**
     * Distinct values of a column of the (tenant-scoped) activity log, keyed by value.
     *
     * @return array<string, string>
     */
    public static function distinctOptions(string $column): array
    {
        $values = self::query()->whereNotNull($column)->distinct()->orderBy($column)->limit(200)->pluck($column)->all();
        $options = [];

        foreach ($values as $value) {
            if (is_scalar($value) && (string) $value !== '') {
                $options[(string) $value] = (string) $value;
            }
        }

        return $options;
    }

    /**
     * The causers found in the log, keyed `type|id`.
     *
     * @return array<string, string>
     */
    public static function causerOptions(): array
    {
        $activityModel = Config::activityModel();
        $options = [];

        $rows = self::query()->whereNotNull('causer_type')->select(['causer_type', 'causer_id'])->distinct()->limit(200)->get();

        foreach ($rows as $row) {
            $activity = (new $activityModel)->forceFill(['causer_type' => $row->getAttribute('causer_type'), 'causer_id' => $row->getAttribute('causer_id')]);
            $options[$row->getAttribute('causer_type').'|'.$row->getAttribute('causer_id')] = ActivityPresenter::causerLabel($activity);
        }

        asort($options);

        return $options;
    }

    /**
     * @return Builder<Model>
     */
    private static function query(): Builder
    {
        /** @var class-string<Model> $model */
        $model = Config::activityModel();

        return \AlfaSix\AlfakitActivityLog\ActivityLogPlugin::get()->applyTenantScope($model::query());
    }

    // ---------------------------------------------------------------- Infolist

    /**
     * The details of one activity: overview, the old → new changes and the other properties.
     *
     * @return array<Component>
     */
    public static function infolist(): array
    {
        return [
            Section::make(self::trans('sections.overview'))
                ->schema([
                    TextEntry::make('description')
                        ->label(self::trans('fields.description'))
                        ->columnSpanFull(),
                    TextEntry::make('event')
                        ->label(self::trans('fields.event'))
                        ->badge()
                        ->formatStateUsing(static fn (?string $state): ?string => ActivityPresenter::eventLabel($state))
                        ->color(static fn (?string $state): string => ActivityPresenter::eventColor($state))
                        ->placeholder('—'),
                    TextEntry::make('log_name')
                        ->label(self::trans('fields.log_name'))
                        ->badge()
                        ->color('gray')
                        ->placeholder('—'),
                    TextEntry::make('subject_type')
                        ->label(self::trans('fields.subject'))
                        ->getStateUsing(static fn (Model $record): ?string => ActivityPresenter::subjectLabel($record))
                        ->url(static fn (Model $record): ?string => ActivityPresenter::subjectUrl($record))
                        ->placeholder('—'),
                    TextEntry::make('causer_id')
                        ->label(self::trans('fields.causer'))
                        ->getStateUsing(static fn (Model $record): string => ActivityPresenter::causerLabel($record)),
                    TextEntry::make('created_at')
                        ->label(self::trans('fields.created_at'))
                        ->dateTime(),
                ])
                ->columns(2),
            Section::make(self::trans('sections.changes'))
                ->schema([self::changesEntry()])
                ->visible(static fn (?Model $record): bool => $record !== null && ActivityPresenter::changeRows($record) !== []),
            Section::make(self::trans('sections.properties'))
                ->schema([
                    KeyValueEntry::make('properties')
                        ->hiddenLabel()
                        ->getStateUsing(static fn (Model $record): array => ActivityPresenter::propertyRows($record))
                        ->keyLabel(self::trans('fields.property'))
                        ->valueLabel(self::trans('fields.value')),
                ])
                ->visible(static fn (?Model $record): bool => $record !== null && ActivityPresenter::propertyRows($record) !== []),
        ];
    }

    /**
     * The changed attributes as a table: attribute, old value, new value.
     */
    public static function changesEntry(string $name = 'attribute_changes'): RepeatableEntry
    {
        return RepeatableEntry::make($name)
            ->label(self::trans('fields.changes'))
            ->hiddenLabel()
            ->getStateUsing(static fn (Model $record): array => ActivityPresenter::changeRows($record))
            ->table([
                TableColumn::make(self::trans('fields.attribute')),
                TableColumn::make(self::trans('fields.old')),
                TableColumn::make(self::trans('fields.new')),
            ])
            ->schema([
                TextEntry::make('attribute')->hiddenLabel(),
                TextEntry::make('old')->hiddenLabel()->placeholder('—')->wrap(),
                TextEntry::make('new')->hiddenLabel()->placeholder('—')->wrap(),
            ]);
    }
}
