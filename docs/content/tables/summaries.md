---
title: Summaries
description: Sum, average, count and range rows below a table, per page, for every record and per group.
---

# Summaries

Give a column one or more summarizers and the table shows a summary row below its records:

```php
use AlfaSix\Alfakit\Tables\Columns\Summarizers\Average;
use AlfaSix\Alfakit\Tables\Columns\Summarizers\Count;
use AlfaSix\Alfakit\Tables\Columns\Summarizers\Range;
use AlfaSix\Alfakit\Tables\Columns\Summarizers\Sum;

$table->columns([
    TextColumn::make('title')->summarize(Count::make()),
    TextColumn::make('price')->money('EUR')->summarize([
        Sum::make()->money('EUR'),
        Average::make()->label('Mean')->money('EUR'),
    ]),
    TextColumn::make('rating')->summarize(Range::make()),
    TextColumn::make('published_at')->date()->summarize(Range::make()->date()),
]);
```

| Summarizer   | Value                                                                                                 |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| `Sum`        | the total of the column                                                                               |
| `Average`    | the mean of the column                                                                                |
| `Count`      | the number of records                                                                                 |
| `Range`      | the smallest and largest value ("1 – 5"); `->excludeNull(false)` gives no range when a value is empty |
| `Summarizer` | whatever your `using()` callback returns                                                              |

Summaries are computed on the server with one aggregate query each, over the records matching the current search and filters:

- **All records** — shown by default ("All posts").
- **This page** — shown as well when the current page does not hold every matching record.

Hide either row with `$table->summaries(pageCondition: false)` or `$table->summaries(allTableCondition: false)` (both accept closures). Group summaries are not affected.

- **Each group** — shown below each [row group](/docs/tables/grouping) when the table is grouped.

Only visible columns are summarised; toggling a column off hides its summary.

## Options

```php
Sum::make()
    ->label('Total')                                        // default: Sum, Average, Count, Range
    ->money('EUR')                                          // or numeric(2), date('Y-m-d'), prefix(), suffix(), formatStateUsing()
    ->query(fn (Builder $query) => $query->where('status', 'paid')) // narrow the records
    ->attribute('amount_cents')                             // summarise another column
    ->hidden(fn () => ! auth()->user()->isAdmin())
    ->hiddenLabel();                                        // label for screen readers only
```

Prefer `hiddenLabel()` over `label('')`: the label stays readable by screen readers.

### Counting icons

On an `IconColumn`, `Count::make()->icons()` counts how often each icon occurs instead of the records, and shows each icon with its count:

```php
IconColumn::make('is_published')->boolean()->summarize(Count::make()->icons());
```

The values are grouped in the database and each distinct state is resolved through the column's `icon()` / `color()` (or `trueIcon()` / `falseIcon()`); closures receive `$state` but not `$record`. On other columns `icons()` is ignored.

Values are formatted on the server with the same helpers as text columns, in the panel's locale and currency. Without a formatter, numbers show up to two decimals.

### Ranges

`Range::make()->minimalDateTimeDifference()` shows dates only when the bounds fall on different days, date and time when they share a day, and one value when they are identical. `Range::make()->minimalTextualDifference()` shows only as much of each bound as it takes to tell them apart ("A – G", "Ban – Bar"). `excludeNull(false)` gives no range when a value is empty.

## Custom summarizers

```php
use AlfaSix\Alfakit\Tables\Columns\Summarizers\Summarizer;
use Illuminate\Database\Query\Builder;

TextColumn::make('price')->summarize(
    Summarizer::make()
        ->label('Highest')
        ->using(fn (Builder $query, string $attribute) => $query->max($attribute))
        ->money('EUR'),
);
```

`$query` selects from the summarised records (a sub-select aliased `alfakit_summary`, so relationship aggregates such as `comments_count` work like columns) and `$attribute` is the column name. Relationship columns (`author.name`) have no column on the table to aggregate, so they are only summarised by a `using()` callback.
