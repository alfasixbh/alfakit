---
title: Enums
description: Give PHP enums a label, colour, icon and description once and AlfaKit uses them in options, columns, entries, badges, filters and navigation groups.
---

# Enums

Implement the contracts in `AlfaSix\Alfakit\Support\Contracts` on an enum and AlfaKit reads them wherever the enum appears: as options of selects, radios, checkbox lists and toggle buttons, as the state of text and icon columns and entries, in select filters and select columns, as table group titles and as navigation groups.

```php
use AlfaSix\Alfakit\Support\Contracts\HasColor;
use AlfaSix\Alfakit\Support\Contracts\HasDescription;
use AlfaSix\Alfakit\Support\Contracts\HasIcon;
use AlfaSix\Alfakit\Support\Contracts\HasLabel;

enum OrderStatus: string implements HasLabel, HasColor, HasIcon, HasDescription
{
    case Pending = 'pending';
    case Shipped = 'shipped';
    case Cancelled = 'cancelled';

    public function getLabel(): string
    {
        return __("orders.status.{$this->value}");
    }

    public function getColor(): string
    {
        return match ($this) {
            self::Pending => 'gray',
            self::Shipped => 'success',
            self::Cancelled => 'danger',
        };
    }

    public function getIcon(): string
    {
        return match ($this) {
            self::Pending => 'clock',
            self::Shipped => 'truck',
            self::Cancelled => 'circle-x',
        };
    }

    public function getDescription(): ?string
    {
        return $this === self::Cancelled ? __('orders.status.cancelled_hint') : null;
    }
}
```

| Contract         | Method                                          | Used by                                                                                                              |
| ---------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `HasLabel`       | `getLabel(): string\|Htmlable\|null`            | Options of every choice field, select columns and filters; text columns and entries; group titles; navigation groups |
| `HasColor`       | `getColor(): Color\|string\|array\|null`        | Text columns and entries (best with `badge()`), icon columns and entries, `ToggleButtons`                            |
| `HasIcon`        | `getIcon(): string\|BackedEnum\|Htmlable\|null` | Text columns and entries, icon columns and entries, `ToggleButtons`, navigation groups                               |
| `HasDescription` | `getDescription(): string\|Htmlable\|null`      | `Radio` and `CheckboxList` options                                                                                   |

Colours are the panel's semantic names (`primary`, `success`, `warning`, `danger`, `info`, `gray`) or a `Support\Enums\Color` case; icons are [Lucide](https://lucide.dev/icons) names or registered aliases. Without `HasLabel` the label is the headlined case name (`UrgentHigh` → "Urgent High"). Enums that only declare the methods, without the interfaces, work too.

## Options

```php
Select::make('status')->options(OrderStatus::class);        // labels
Radio::make('status')->options(OrderStatus::class);         // labels + descriptions
CheckboxList::make('statuses')->options(OrderStatus::class); // labels + descriptions
ToggleButtons::make('status')->options(OrderStatus::class); // labels + colours + icons
SelectFilter::make('status')->options(OrderStatus::class);
SelectColumn::make('status')->options(OrderStatus::class);
```

Option values are the backing values (case names for pure enums). Explicit `descriptions()`, `colors()` and `icons()` maps win over the enum for the options they name. Add `->enum(OrderStatus::class)` to a field to validate the submitted value against the enum as well.

## Columns and entries

When the model casts the attribute to the enum, text columns and entries show its label, colour and icon without any configuration:

```php
// protected function casts(): array { return ['status' => OrderStatus::class]; }

TextColumn::make('status')->badge();
TextEntry::make('status')->badge();
IconColumn::make('status');   // the enum's icon, in its colour
```

When the raw backing value is stored without a cast (a JSON path, an array row, a `getStateUsing()` result), name the enum so the value is turned back into its case. `enum()` is an AlfaKit addition; values that are not a case of the enum are shown as they are.

```php
TextColumn::make('timeline.last_step')->badge()->enum(OrderStatus::class);
TextEntry::make('meta.status')->enum(OrderStatus::class);
IconColumn::make('status')->enum(OrderStatus::class);
```

Lists of enums (an `AsEnumCollection` cast, or a JSON array with `enum()`) show one label per item. When every item has the same colour or icon it is sent as the cell's `color` / `icon`; when they differ, the cell also carries `itemColors` and `itemIcons` (one entry per item).

`color()`, `icon()` and `formatStateUsing()` always win over the enum, and their closures receive the case as `$state`:

```php
TextColumn::make('status')
    ->badge()
    ->color(fn (OrderStatus $state): string => $state === OrderStatus::Pending ? 'warning' : $state->getColor());
```

Grouping a table by an enum attribute titles each group with the enum label.

## Navigation groups

A navigation group can be an enum case implementing `HasLabel` (the group label) and, optionally, `HasIcon` (the group icon):

```php
enum NavigationGroup implements HasLabel, HasIcon
{
    case Shop;
    case Content;

    public function getLabel(): string
    {
        return __("navigation.{$this->name}");
    }

    public function getIcon(): string
    {
        return $this === self::Shop ? 'shopping-bag' : 'file-text';
    }
}

class ProductResource extends Resource
{
    public static function getNavigationGroup(): string|UnitEnum|null
    {
        return NavigationGroup::Shop;
    }
}
```

The `$navigationGroup` property stays `?string` (so existing resources keep compiling); return the enum from `getNavigationGroup()` on resources and pages instead. The group takes its label and icon from the enum, and `$panel->navigationGroups([NavigationGroup::Shop, NavigationGroup::Blog])` orders enum groups too. `NavigationItem::make()->group(NavigationGroup::Shop)` and `NavigationGroup::make(NavigationGroup::Shop)` (in `$panel->navigationGroups([...])` or a custom navigation builder) accept enum cases as well.

## Reading enums in your own code

`AlfaSix\Alfakit\Support\EnumState` holds the helpers AlfaKit uses: `EnumState::resolve($state, OrderStatus::class)` turns a stored value (or a case) into the case, and `label()`, `color()`, `icon()`, `description()` and `options()` read the contracts.

## Migrating from Filament

`Filament\Support\Contracts\HasLabel`, `HasColor`, `HasIcon` and `HasDescription` map to the AlfaKit contracts of the same name; `alfakit:migrate-from-filament` rewrites the imports, and `Heroicon::*` icons returned from `getIcon()` become Lucide names.
