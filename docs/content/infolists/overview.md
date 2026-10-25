---
title: Infolists
description: Read-only presentation of records.
---

# Infolists

An infolist is a schema of **entries** — read-only components whose value comes from the record. Resources use it on the view page; actions use it in `modalContent()`; custom pages can render one with `infolist(Schema $schema)`.

This works the same in admin panels and starter kit panels. Outside panels, generate one with `php artisan make:alfakit-infolist UserDetails --model=User` and render it in your own page, see [Actions and infolists](../standalone/actions-and-infolists).

```php
use AlfaSix\Alfakit\Infolists\Components\{ColorEntry, IconEntry, ImageEntry, KeyValueEntry, RepeatableEntry, TextEntry};
use AlfaSix\Alfakit\Schemas\Components\Section;

public static function infolist(Schema $schema): Schema
{
    return $schema->components([
        Section::make('Post')->schema([
            TextEntry::make('title')->size('lg')->weight('semibold')->columnSpanFull(),
            TextEntry::make('status')->badge()->color(fn (?string $state) => $state === 'published' ? 'success' : 'gray'),
            TextEntry::make('author.name')->label('Author')->url(fn ($record) => UserResource::getUrl('view', ['record' => $record->author])),
            TextEntry::make('tags.name')->badge()->color('info'),
            IconEntry::make('is_featured')->boolean(),
            TextEntry::make('published_at')->dateTime()->since(),
            TextEntry::make('price')->money('USD'),
            TextEntry::make('content')->html()->prose()->columnSpanFull(),
            ImageEntry::make('gallery')->circular()->stacked()->limit(4),
            ColorEntry::make('brand_color')->copyable(),
            KeyValueEntry::make('meta'),
            RepeatableEntry::make('comments')->schema([TextEntry::make('author_name'), TextEntry::make('body')])->grid(2)->contained(),
        ])->columns(3),
    ]);
}
```

`html()` and `markdown()` sanitise string state on the server, and `url()` drops `javascript:` and other unsafe schemes; see [Security](../advanced/security#html-output).

Entries share `TextColumn`'s formatting API (`date()`, `money()`, `limit()`, `badge()`, `listWithLineBreaks()`, …) plus `helperText()`, `hint()`, `tooltip()`, `url()`, `placeholder()`, `getStateUsing()`, `state()`, `default()`, and the [field actions](../forms/field-actions) `prefixActions()`, `suffixActions()` and `hintActions()`.

An infolist in a section, with a copyable number, a badge, money and a boolean icon:

```alfakit-example name="infolist-basic"

```

### Content slots

Entries have the label and content slots of [fields](../forms/fields#content-slots): `aboveLabel()`, `beforeLabel()`, `afterLabel()`, `belowLabel()`, `aboveContent()`, `beforeContent()`, `afterContent()` and `belowContent()`. They take text, `Htmlable`, schema components, actions or a closure, with an optional `Alignment`:

```php
TextEntry::make('api_key')
    ->afterLabel(Icon::make('lock')->tooltip('Secret'))
    ->belowContent([
        Text::make('Rotate it every 90 days.'),
        Action::make('rotate')->requiresConfirmation()->action(fn (Project $record) => $record->rotateKey()),
    ]);
```

Slot actions run through the action endpoint like hint actions.

### Alignment and attributes

```php
TextEntry::make('total')->money('EUR')->alignEnd();      // alignment(Alignment::End)
TextEntry::make('sku')
    ->extraAttributes(['class' => 'font-mono'])           // on the value
    ->extraEntryWrapperAttributes(['data-testid' => 'sku']); // on the label + value wrapper
```

- `alignment()` takes `Alignment::Start`, `Center`, `End` or `Justify` (`alignStart()`, `alignCenter()`, `alignEnd()`, `alignJustify()` are shortcuts) and aligns the value, badges and icons included. It follows the text direction.
- `extraAttributes()` go on the value (`data-slot="entry-value"`), `extraEntryWrapperAttributes()` on the element wrapping the label and value (`data-slot="entry"`). Classes are merged with the renderer's.

> **Upgrading:** `extraAttributes()` on entries used to land on the wrapper. Move wrapper attributes to `extraEntryWrapperAttributes()`.

### Visibility by operation

Like fields, entries take `hiddenOn('edit')` / `visibleOn(['view', 'edit'])` (an operation or a list), next to `hidden()` and `visible()` with closures. An infolist on a view page has the `view` operation.

### Deferred sections

Layout components in infolists take `deferLoading()` like in forms: the page renders a skeleton and loads the entries once it scrolls into view. See [Deferred loading](../forms/layout#deferred-loading).

`RepeatableEntry` can show its items as a table, one column per item entry:

```php
use AlfaSix\Alfakit\Infolists\Components\RepeatableEntry\TableColumn;
use AlfaSix\Alfakit\Support\Enums\Alignment;

RepeatableEntry::make('lines')
    ->table([TableColumn::make('Product'), TableColumn::make('Quantity')->alignment(Alignment::End)])
    ->schema([TextEntry::make('product.name'), TextEntry::make('quantity')]);
```

`TableColumn` works as for [Repeater tables](../forms/fields#table-layout).

Entries inside a `Section::make()->relationship('seo')` read the related record ([Relationships](../forms/layout#relationships)).

Dotted names walk relationships; a *-to-many relationship yields a list (`tags.name` → badges).

Entries take `inlineLabel()` to show the label beside the value from `sm` up (stacked on phones); set it on a `Section` or the whole `Schema` to apply it to every entry inside. See [Layout](../forms/layout).

## Icon and key-value entries

```php
IconEntry::make('is_active')->boolean()
    ->trueIcon('badge-check')->trueColor('success')
    ->falseIcon('x-circle')->falseColor('gray');

KeyValueEntry::make('meta')->keyLabel('Setting')->valueLabel('Current value');
```

## Relationship lists and aggregates

For a list read through a *-to-many relationship, `color()`, `icon()` and `url()` closures run once per item: `$relatedRecord` is the related model the item came from and `$state` the item itself. Values that agree for every item are sent once; otherwise each badge gets its own colour, icon or link:

```php
TextEntry::make('tags.name')
    ->badge()
    ->color(fn (Tag $relatedRecord): string => $relatedRecord->color)
    ->url(fn (Tag $relatedRecord): string => TagResource::getUrl('view', ['record' => $relatedRecord]));
```

Formatting closures run per item too and receive `$relatedRecord`: `formatStateUsing()`, `limit()`, `words()`, `prefix()`, `suffix()`, `markdown()`, `html()` and `timezone()`, e.g. `->formatStateUsing(fn (string $state, Tag $relatedRecord): string => "{$state} ({$relatedRecord->posts_count})")`. `IconColumn` passes it to `icon()`, `color()` and the boolean icons and colours.

States set with `state()` / `getStateUsing()`, and lists that don't come from a relationship (a JSON array), keep evaluating the closure once with the whole state.

`TextEntry` loads relationship aggregates like table columns do. Name the entry after the attribute Eloquent produces:

```php
TextEntry::make('comments_count')->counts('comments'),
TextEntry::make('approved_comments_count')->counts(['comments as approved_comments_count' => fn (Builder $query) => $query->where('approved', true)]),
TextEntry::make('comments_exists')->exists('comments'),
TextEntry::make('order_items_sum_total')->sum('orderItems', 'total')->money('USD'),
TextEntry::make('reviews_avg_rating')->avg('reviews', 'rating')->numeric(1),
TextEntry::make('bids_min_amount')->min('bids', 'amount'),
TextEntry::make('bids_max_amount')->max('bids', 'amount'),
```

The aggregate is loaded onto the record (`loadCount()`, `loadExists()`, `loadAggregate()`) the first time the entry is shown, unless the record already has the attribute. The related model's global scopes (tenancy included) apply.

## Images

`ImageEntry` shows one image or a list of them. Paths are resolved on `disk()` (default `alfakit.default_filesystem_disk`); with `visibility('private')` the URL is a temporary URL valid for `config('alfakit.temporary_file_url_expiry_minutes')` (30) minutes rounded up to the end of the hour, or `temporaryUrlExpiry($minutes)`.

```php
ImageEntry::make('photos')
    ->disk('s3')->visibility('private')
    ->imageHeight(80)->square()          // or circular(); imageWidth(), imageSize()
    ->stacked()->limit(3)->limitedRemainingText(size: 'md') // "+N" for the rest (shown by default; false hides it)
    ->checkFileExistence()               // skip paths missing on the disk
    ->defaultImageUrl(asset('images/placeholder.png'))
    ->alt(fn (?string $state, Product $record): string => "Photo of {$record->name}");
```

`limitedRemainingText(size:)` takes `xs`, `sm` (default), `md` or `lg`. `checkFileExistence()` calls `exists()` on the disk for each image, so a missing file falls back to `defaultImageUrl()` instead of a broken image. `imageWidth()`, `imageHeight()` and `imageSize()` are the Filament names of `width()`, `height()` and `size()`. `alt()` sets the alternative text; a closure runs once per image with `$state` set to that image's path (null for the default image).

Stacked images take `ring(0–8)` (pixels, 2 by default) and `overlap(0–8)` (quarter rems, 2 by default); `extraImgAttributes(['loading' => 'lazy'])` adds attributes to every `<img>` (`class` is merged with the entry's own).

## Text entry dates and lists

`TextEntry` formats like `TextColumn`: besides `date()`, `dateTime()`, `time()` and `since()` there are `isoDate()`, `isoDateTime()` and `isoTime()` (Carbon `isoFormat()` patterns, `'L'` / `'LLL'` / `'LT'` by default) and date tooltips (`dateTooltip()`, `dateTimeTooltip()`, `timeTooltip()`, `isoDateTooltip()`, `isoDateTimeTooltip()`, `isoTimeTooltip()`, `sinceTooltip()`; an explicit `tooltip()` wins). `limitList(3)->expandableLimitedList()` hides the rest of a list behind a "+N more" button, and `getCharacterLimit()` returns the `limit()` length for a tooltip of the full text:

```php
TextEntry::make('published_at')->isoDate('LL')->sinceTooltip();
TextEntry::make('tags.name')->badge()->limitList(3)->expandableLimitedList();
TextEntry::make('published_at')->dateTime()->timezone('Asia/Dubai');
TextEntry::make('total')->money('EUR', decimalPlaces: 0);
TextEntry::make('weight')->numeric(decimalPlaces: 1, decimalSeparator: ',', thousandsSeparator: '.');
TextEntry::make('api_key')->copyable()->copyMessage('Key copied')->copyMessageDuration(3000);
ColorEntry::make('brand_color')->copyable()->copyMessageDuration(1000);
```

`timezone()`, `numeric(decimalPlaces:, decimalSeparator:, thousandsSeparator:, maxDecimalPlaces:, locale:)` and `money(decimalPlaces:)` work as on [text columns](../tables/columns#formatting-textcolumn). `copyMessage()` and `copyMessageDuration()` (milliseconds, 1500 by default) set the confirmation after copying on `TextEntry` and `ColorEntry`.

## Code

`CodeEntry` shows highlighted, read-only code. Array state (a JSON cast, an `Arrayable`) is printed as pretty JSON, with `json` as the grammar unless you set one:

```php
use AlfaSix\Alfakit\Forms\Components\CodeEditor\Enums\Language;
use AlfaSix\Alfakit\Infolists\Components\CodeEntry;

CodeEntry::make('payload')->grammar(Language::Json)->copyable()->copyMessage('Copied!')->copyMessageDuration(1500);
CodeEntry::make('snippet')->grammar('php');
CodeEntry::make('settings')->jsonFlags(JSON_PRETTY_PRINT);
```

The highlighter is the `CodeEditor` field's: json, php, javascript (`js`), typescript (`ts`), html, xml, css, sql, yaml, markdown, python, java, go and cpp; other grammars are shown as plain code. Any string-backed enum works as a grammar, so a migrated Phiki `Grammar` case keeps working. `lightTheme()` and `darkTheme()` take a theme name that the renderer exposes as `data-light-theme` / `data-dark-theme` on the `data-slot="code-entry"` block for your theme CSS; the built-in colours follow the panel theme. Code is always laid out left to right, also in RTL panels.

`ViewEntry` renders an entry with a frontend component registered in `createAlfakit({ components })`. The component receives the entry's `state`, the `viewData()` props and the entry schema as `component`:

```php
ViewEntry::make('events')
    ->view('OrderTimeline')
    ->viewData(fn (Order $record): array => ['currency' => $record->currency]);
```

`component()` and `props()` are aliases of `view()` and `viewData()`; the label, hint, helper text and tooltip work as on other entries.

Layout components (`Section`, `Grid`, `Tabs`, `Fieldset`) work exactly as in forms.

## Enums

`TextEntry` and `IconEntry` show the label, colour and icon of an enum state (`HasLabel`, `HasColor`, `HasIcon`). When the raw backing value is stored, add `->enum(OrderStatus::class)`: `TextEntry::make('meta.status')->badge()->enum(OrderStatus::class)`. See [Enums](../advanced/enums).
