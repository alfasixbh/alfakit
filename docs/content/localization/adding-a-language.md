---
title: Adding a language
description: Translate AlfaKit into a new language, override individual strings, and ship translations from plugins.
---

# Adding a language

Translations are layered, so any package can add languages and your app always has the last word:

1. **English** ships with `alfasix/alfakit`. It is the source every translation is checked against.
2. **Language packs** come from `alfasix/alfakit-translations` and from any plugin that registers a directory.
3. **Your app's overrides** in `lang/vendor/alfakit/{locale}/*.php` win over everything.

## A language nobody ships yet

Scaffold it, translate the files, then enable it:

```bash
php artisan alfakit:lang:add sw
```

This writes every string no installed package translates yet to `lang/vendor/alfakit/sw/`, in English, ready to translate. The header of each file shows the language, its direction and the rules:

```php
<?php

declare(strict_types=1);

// Swahili (sw, ltr) — alfakit::ui
// Keep :placeholders unchanged. Plurals use Laravel's `one|other` syntax.

return [
    'save' => 'Save',
    // …
];
```

```php
$panel->locales(['en', 'sw']);
```

That enables it in an admin panel or a starter kit panel (the header's language switcher lists it too). [Outside panels](../standalone/overview), components follow the app's language, so set `APP_LOCALE=sw` or switch with your own locale middleware.

Nothing else is needed. The direction, native name and first day of the week come from ICU, so `alfakit:lang:add ckb` already produces a right-to-left Central Kurdish panel.

## Override a few strings

Use the same directory and include only the keys you want to change:

```php
// lang/vendor/alfakit/de/actions.php
return [
    'create' => ['label' => 'Neuer Eintrag: :label'],
];
```

Files are merged key by key, so the rest still comes from the language pack. To start from the full pack instead, run `php artisan alfakit:lang:add de --all`.

## Check for missing strings

When AlfaKit adds a string in an update, check which languages need it:

```bash
php artisan alfakit:lang:check
```

```
+--------+------------+------------+---------+--------------+----------+
| Locale | Language   | Translated | Missing | Placeholders | Obsolete |
+--------+------------+------------+---------+--------------+----------+
| ar     | Arabic     | 100%       | 0       | 0            | 0        |
| sw     | Swahili    | 96%        | 11      | 0            | 0        |
+--------+------------+------------+---------+--------------+----------+
```

It counts keys, not wording: a scaffold from `alfakit:lang:add` shows 100% while its strings are still English. Add `-v` to list the keys. The command fails when strings are missing or a translation dropped a `:placeholder`, so it can run in CI. A missing string falls back to the base language's pack for a regional or script variant (`ar` for `ar_EG`), then to English (`app.fallback_locale`), so a half-translated language still works.

## Translations for plugins

A plugin registers its own directory, either into `alfakit::` (to translate the core) or under its own namespace:

```php
use AlfaSix\Alfakit\Localization\Translations;

public function register(): void
{
    Translations::register(__DIR__.'/../lang', namespace: 'maps');
}
```

Apps override plugin strings the same way, from `lang/vendor/maps/{locale}`. The commands take `--namespace=maps`.

## Contributing a language

To add a language to `alfasix/alfakit-translations`, open a pull request with `packages/translations/lang/{locale}/*.php`. CI checks every pack mirrors the English files exactly: same keys, no empty strings, same `:placeholders`. Native-speaker reviews of the existing packs are very welcome too.
