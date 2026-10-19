---
title: Grouping
description: Group rows by an attribute, a relationship or a date, with collapsible groups and group summaries.
---

# Grouping

```php
use AlfaSix\Alfakit\Tables\Grouping\Group;

$table
    ->groups([
        Group::make('status')->collapsible(),
        Group::make('author.name')->label('Author'),
        Group::make('published_at')->date()->titlePrefixedWithLabel(false),
    ])
    ->defaultGroup('status');
```

Users pick a group (or none) and its direction from the **Group by** menu in the toolbar; the choice lives in the query string (`?group=author.name&groupDirection=desc`, `?group=` turns a default group off). Rows are ordered by the group first, so each group's rows stay together across pages, and every group gets a heading row. When columns have [summarizers](/docs/tables/summaries), each group also gets a summary row computed over all of its records.

`groups()` also accepts column names: `->groups(['status', 'author.name'])`.

## Groups

| Method                                                              | Effect                                                                                                                                                                                          |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `label('Author')`                                                   | the name in the menu and the heading prefix                                                                                                                                                     |
| `collapsible()`                                                     | a toggle on the heading collapses the group's rows                                                                                                                                              |
| `titlePrefixedWithLabel(false)`                                     | headings read "Draft" instead of "Status: Draft"                                                                                                                                                |
| `date()` / `date(format: 'F Y')`                                    | group a date or date-time by calendar day in the panel's timezone                                                                                                                               |
| `getTitleFromRecordUsing(fn (Post $record) => …)`                   | the heading text                                                                                                                                                                                |
| `getDescriptionFromRecordUsing(fn (Post $record) => …)`             | a line under the heading                                                                                                                                                                        |
| `getKeyFromRecordUsing(fn (Post $record) => …)`                     | what makes rows belong together (pair with `scopeQueryByKeyUsing()` for group summaries)                                                                                                        |
| `orderQueryUsing(fn (Builder $query, string $direction) => …)`      | how rows are ordered by group                                                                                                                                                                   |
| `scopeQueryByKeyUsing(fn (Builder $query, ?string $key) => …)`      | limit a query to one group's rows                                                                                                                                                               |
| `groupQueryUsing(fn (Builder $query) => $query->groupBy('status'))` | group a query by the group: `groupsOnly()` tables find their groups with this one grouped query instead of reading every record (the group column is selected when the closure selects nothing) |

A dotted name (`author.name`) groups by a relationship attribute: rows are ordered with a sub-select and the relationship is eager loaded. Rows without a value form a "No value" group.

An attribute cast to an [enum](/docs/advanced/enums) is titled with the enum's label (`HasLabel`, or the headlined case name: `archived` → "Archived"), and the enum's icon (`HasIcon`) is shown before the title in its colour (`HasColor`). For a raw stored value (an uncast column, a JSON path, a `records()` array), name the enum: `Group::make('status')->enum(OrderStatus::class)`. The group key (`?group=` and the records' `group`) stays the backing value.

## Table options

```php
$table
    ->groups([...])
    ->defaultGroup('status')              // or a Group instance
    ->defaultGroup('status', direction: 'desc') // the default group starts descending
    ->groupingSettingsHidden()            // no menu: the default group always applies
    ->groupingDirectionSettingHidden()    // always ascending
    ->collapsedGroupsByDefault()          // collapsible groups start collapsed
    ->groupsOnly()                        // only headings and group summaries, no rows
    ->groupingSettingsInDropdownOnDesktop() // keep the dropdown on desktop too
    ->groupRecordsTriggerAction(fn (Action $action) => $action->button()->label('Group records'));
```

From `sm` up the group and direction selects sit inline in the toolbar; phones (and every screen with `groupingSettingsInDropdownOnDesktop()`) get the **Group by** dropdown, whose button `groupRecordsTriggerAction()` restyles like the [filter buttons](filters#customising-the-filter-buttons).

`groupsOnly()` lists every group of the matching records (up to 1000) with its summary and no pagination — handy as a report next to summarizers.

Grouping applies to tables shown as rows; record layouts (`Split`, `Stack`, `contentGrid()`) are not grouped.
