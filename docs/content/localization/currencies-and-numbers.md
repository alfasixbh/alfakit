---
title: Currencies, numbers and dates
description: Money in any currency with the right precision and symbol, locale-aware numbers, and per-user timezones.
---

# Currencies, numbers and dates

All formatting is driven by ICU, through PHP's intl extension on the server and the browser's `Intl` APIs in the frontend. Every ISO 4217 currency and every locale works without configuration tables. The Bahraini dinar has three decimals, the yen has none, the euro symbol goes after the amount in German, and Arabic can use Arabic-Indic digits.

## The panel's currency

Set a default currency for money columns, entries and inputs:

```php
$panel->currency('EUR');

// Per tenant or per user:
$panel->currency(fn () => auth()->user()?->team?->currency ?? 'USD');
```

Without it, AlfaKit uses `config('alfakit.currency')` and then Laravel's `Number::defaultCurrency()`. The panel currency is also applied to Laravel's `Number` helper for the request, so `Number::currency($amount)` in your own code agrees with the panel.

## Showing money

```php
TextColumn::make('price')->money();                        // panel currency
TextColumn::make('price')->money('JPY');                   // fixed currency
TextColumn::make('total')->money(fn (Order $record) => $record->currency); // per row
```

Store money as integers of the smallest unit (cents, fils, yen) to avoid rounding errors. Then say so, and the right divisor is used for each currency: 100 for USD, 1000 for BHD, 1 for JPY.

```php
TextColumn::make('total')->money(fn (Order $record) => $record->currency, inMinorUnits: true);
TextEntry::make('total')->money('BHD', inMinorUnits: true);   // 12500 → BHD 12.500
```

`divideBy: 100` still works for a fixed divisor. Pass `locale:` to force a format regardless of the user's language.

## Entering money

`MoneyInput` handles the symbol, separators and precision for you:

```php
use AlfaSix\Alfakit\Forms\Components\MoneyInput;

MoneyInput::make('price')->currency('EUR')->minValue(0);

// The currency comes from another field, and the value is stored in minor units:
Select::make('currency')->currencies()->searchable()->live(),
MoneyInput::make('total')
    ->currency(fn (Get $get) => $get('currency'))
    ->minorUnits(),
```

- The currency symbol is placed where the user's locale writes it, before the amount in English and after it in German or Arabic.
- Users type in their own format: `1.234,50` in German, `1 234,50` in French, or Arabic-Indic digits such as `١٢٫٥`. A lone dot such as `12.5` is read as a decimal point everywhere.
- On blur the value is rounded to the currency's decimals and shown with grouping.
- Validation adds `numeric` and `decimal:0,{digits}` for the currency, plus your `minValue()` and `maxValue()` in major units.
- The form value is a plain decimal string (`"1234.50"`). With `minorUnits()`, the stored value is an integer: 123450.

## Currency, language and timezone pickers

```php
Select::make('currency')->currencies()->searchable();          // all currencies in circulation
Select::make('currency')->currencies(['USD', 'EUR', 'BHD']);   // a subset, in this order
Select::make('language')->languages()->searchable();          // every language ICU knows
Select::make('locale')->panelLocales();                       // the panel's languages
Select::make('timezone')->timezones()->searchable();          // "Asia/Bahrain (UTC+03:00)"
```

Names are shown in the user's language: "Euro (EUR)" in English, "euro (EUR)" in French, "يورو (EUR)" in Arabic. The same helpers exist on radios, checkbox lists and select filters.

In PHP, the `Currency` class gives you the same data:

```php
use AlfaSix\Alfakit\Support\Currency;

Currency::decimals('BHD');                 // 3
Currency::name('JPY', 'de');               // "Japanischer Yen"
Currency::symbol('EUR', 'de');             // "€"
Currency::format(12345, 'BHD', inMinorUnits: true);
Currency::toMinorUnits('19.99', 'USD');    // 1999
Currency::fromMinorUnits(12345, 'BHD');    // "12.345", exact
```

## Numbers

`numeric()` formats with the user's locale by default:

```php
TextColumn::make('views')->numeric();                 // 1,234,567 · 1.234.567 · ١٬٢٣٤٬٥٦٧
TextColumn::make('rating')->numeric(decimalPlaces: 1);
```

## Dates and timezones

Dates are stored in your app timezone (`config('app.timezone')`, usually UTC). They are shown and entered in the panel's timezone, which can be different for every user:

```php
$panel->timezone(fn () => auth()->user()?->timezone);
```

- Date and date-time columns and entries convert to that timezone. Month and day names follow the user's language: "5 janvier 2026", "5 يناير 2026".
- `since()` gives relative times in the user's language: "il y a 3 jours", "منذ 3 أيام".
- `DateTimePicker` shows the stored moment in the user's timezone and converts it back on save. Date-only and time-only pickers are not shifted, because they don't describe a moment.
- A field can still set its own: `DateTimePicker::make('departs_at')->timezone('Asia/Bahrain')`.
- The calendar starts the week on the locale's first day: Saturday for Arabic, Sunday for US English, Monday for most of Europe. Change it with `->firstDayOfWeek()`.

## Formatting in custom components

Each adapter exposes a formatter bound to the user's locale, currency and timezone:

```tsx
const format = useFormatter()

format.money(12.5) // panel currency
format.money(12500, 'BHD', { minorUnits: true })
format.number(0.256, { style: 'percent' })
format.date(order.created_at) // medium date, user's timezone
format.relative(order.created_at) // "3 days ago"
format.list(['Ada', 'Grace', 'Linus']) // "Ada, Grace, and Linus"
format.parseNumber('1.234,5') // 1234.5 in German
```

In Svelte, `useFormatter()` returns a reactive box, so read the formatter through `.current`, as in `format.current.money(12.5)`. `useLocalization()` and `useDirection()` return plain values in every adapter.
