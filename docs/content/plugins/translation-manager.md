---
title: Translation Manager
description: Let non-developers edit your app's translations in the panel, with placeholder checks, an instant database layer, export to lang files and reviewed AI translations.
---

# Translation Manager

`alfasix/alfakit-translation-manager` adds a **Translations** page to a panel. The people who write your copy can edit every key of your application, in every language, without a deploy:

- a spreadsheet-like grid of keys by language, with search (keys and texts), filters (missing, changed in the panel, with warnings, AI suggestions, unused in the code, used but not defined) and a group filter, paginated on the server;
- inline editing with the keyboard: arrow keys move, Enter edits and saves (then moves down), Shift + Enter adds a line break, Tab saves and moves to the next language, Escape cancels;
- placeholder checks: a warning when a translation drops or invents a `:placeholder`, changes the HTML tags or loses the plural forms of the base text;
- one input per plural form for `|` strings, labelled with the numbers each form is used for in that language (Laravel's own plural rules), or with the base text's conditions (`{0}`, `[1,19]`);
- right-to-left inputs for Arabic, Persian, Hebrew, Urdu and other RTL languages;
- progress bars per language, language columns you can show and hide, a history of every change (who, when, from what) and an "Add language" action;
- an override layer in the database that applies instantly through Laravel's translation loader (cached), plus "Export to files" (atomic writes, backups) and "Import from files";
- a source scan (`alfakit-translations:scan`) that finds the keys your PHP, Blade, JavaScript, TypeScript, Vue and Svelte code uses;
- "Translate with AI" (with `laravel/ai`): missing texts become suggestions that someone accepts or rejects, never published automatically.

The grid renders in React, Vue and Svelte (registry key `translation-manager`), right to left included.

Works on an [admin panel](../getting-started/installation) and on a [starter kit](../getting-started/starter-kits) panel (`->starterKit()`), where its pages are listed in your app's sidebar. It needs a panel, so it doesn't apply to [standalone](../standalone/overview) components.

## Installation

```bash
composer require alfasix/alfakit-translation-manager
php artisan vendor:publish --tag=alfakit-translation-manager-migrations
php artisan migrate
```

Optionally publish the config file (`config/alfakit-translation-manager.php`):

```bash
php artisan vendor:publish --tag=alfakit-translation-manager-config
```

For AI translations, install the [Laravel AI SDK](https://laravel.com/docs/ai-sdk) and configure a provider:

```bash
composer require laravel/ai
```

## Register

```php
use AlfaSix\AlfakitTranslationManager\TranslationManagerPlugin;
use App\Models\User;

$panel->plugin(
    TranslationManagerPlugin::make()
        ->authorize(fn (User $user): bool => $user->is_admin),
);
```

`$user->is_admin` stands for your own check: a new Laravel app's `users` table has no such column, so use a role, a gate or a column you add. The closure's `bool` return type is strict: SQLite returns `0`/`1` and a model created without the attribute holds `null`, so cast the column to `boolean` and give it a default, or return `(bool) $user->is_admin`.

Access is **denied by default**. Without `authorize()`, the `manageTranslations` gate decides, and nobody passes while it isn't defined:

```php
use Illuminate\Support\Facades\Gate;

Gate::define('manageTranslations', fn (User $user): bool => $user->hasRole('translator'));
```

The check runs for the page, every header action and every request of the grid.

The page lists the texts of your `lang` directory. A new Laravel app has none (the framework's own texts stay in `vendor`), so the grid starts empty: run `php artisan lang:publish` to get Laravel's `auth`, `pagination`, `passwords` and `validation` texts, add your own files, or use **Scan the code** (under **More**) to list the keys your code uses.

## Where edits are stored

```php
use AlfaSix\AlfakitTranslationManager\Enums\StorageMode;

TranslationManagerPlugin::make()->mode(StorageMode::Database); // default
TranslationManagerPlugin::make()->filesOnly();
TranslationManagerPlugin::make()->databaseAndFiles();
```

| Mode                          | Saving a text                    | The application reads                    |
| ----------------------------- | -------------------------------- | ---------------------------------------- |
| `database` (`databaseOnly()`) | a row in `alfakit_translations`  | lang files with the database rows on top |
| `files` (`filesOnly()`)       | the lang file is rewritten       | the lang files                           |
| `both` (`databaseAndFiles()`) | a database row and the lang file | lang files with the database rows on top |

In the database modes the plugin wraps Laravel's translation loader: lines come from your lang files, then `lang/vendor` overrides, then the database. The rows of a language are read once and cached (`cache.store`, `cache.ttl` in the config); every save bumps a version, so all servers and workers see the change on their next request. Empty texts are never applied, so Laravel still falls back to the fallback locale.

The same settings are available in the config file (`mode`, `lang_path`, `base_locale`, `backups`, `cache`, `scan`, `namespaces`); the plugin's methods override them.

### Export and import

**Export to files** (header menu, or `php artisan alfakit-translations:export --locale=de`) writes the database rows to `lang/{locale}/{group}.php`, `lang/{locale}.json` and `lang/vendor/{namespace}/{locale}/{group}.php`, then removes the exported rows (the files hold them now). PHP files are written with `var_export()`-style short arrays; JSON files are pretty-printed with unescaped Unicode. Every write goes to a temporary file in the same directory and is renamed into place, and the previous file is copied to the backup directory first (`storage/app/alfakit-translations/backups/{date}` by default):

```php
TranslationManagerPlugin::make()->backups(storage_path('translation-backups'));
TranslationManagerPlugin::make()->backups(false); // no backups
```

**Import from files** (or `php artisan alfakit-translations:import --overwrite`) copies the lang files into the database, for example to move to the database-only mode. Without "overwrite", texts changed in the panel keep their changes.

## Languages

```php
TranslationManagerPlugin::make()
    ->baseLocale('en')                       // translators translate from it (app.fallback_locale by default)
    ->locales(['en', 'de', 'fr', 'ar'])      // the columns (every language of lang/ by default)
    ->editableLocales(fn (User $user): array => $user->translatorLocales());
```

`editableLocales()` limits what a user may change; other languages are shown read-only. The server checks it again on every save.

**Add language** creates a language with every key of the base language, empty. In the `files` and `both` modes it also creates `lang/{locale}/` and `lang/{locale}.json`.

Packages' own translations are listed when you name their namespaces (overrides in `lang/vendor` are always listed):

```php
TranslationManagerPlugin::make()->namespaces(['alfakit']);
```

## Scanning the code

```bash
php artisan alfakit-translations:scan --missing --unused
php artisan alfakit-translations:scan --json
php artisan alfakit-translations:scan --fail-on-missing   # for CI
```

The scan looks for `__()`, `trans()`, `trans_choice()`, `Lang::get()`, `@lang` and `@choice` in PHP and Blade, and `t()`, `$t()`, `trans()`, `__()` and `i18n.t()` in JavaScript, TypeScript, Vue and Svelte. Keys built at runtime (`__("status.{$state}")`, `'status.'.$state`, ``t(`roles.${role}`)``) count as used prefixes, so `status.*` keys aren't reported as unused. The page's **Scan the code** action runs the same scan; afterwards the grid offers the "Unused in the code" and "Used but not defined" filters, and keys the code uses but no file defines can be translated right away.

```php
TranslationManagerPlugin::make()->scanPaths(['app', 'resources/views', 'resources/js', 'routes', 'modules']);
```

## AI translation

With `laravel/ai` installed, **Translate with AI** asks for a language (and optionally a group) and translates the missing texts from the base language. Before anything is sent, placeholders, HTML tags, entities and plural conditions are replaced by markers; a result that loses or duplicates a marker is skipped. Results are stored as suggestions: the grid marks them, the details panel shows them with **Accept** and **Reject**, and "Accept all without warnings" applies the safe ones. Accepted suggestions are recorded in the history as AI changes.

```php
TranslationManagerPlugin::make()
    ->aiProvider('anthropic')            // and optionally a model name
    ->aiBatchSize(25, limit: 200)   // texts per request, texts per run
    ->aiTranslation(fn (User $user): bool => $user->is_admin);
```

To use another service, bind your own `MachineTranslator`:

```php
use AlfaSix\AlfakitTranslationManager\Contracts\MachineTranslator;

$this->app->bind(MachineTranslator::class, DeepLTranslator::class);
```

In tests, fake the agent:

```php
use AlfaSix\AlfakitTranslationManager\Ai\TranslationAgent;

TranslationAgent::fake([['translations' => [['id' => 'l1', 'text' => 'Hallo']]]]);
```

## Tenancy

By default translations are application-wide: an editor on a tenant panel edits the texts of every tenant. To let each tenant override texts for itself, make the plugin tenant-scoped:

```php
TranslationManagerPlugin::make()->tenantScoped();
```

Edits are then stored per tenant in the database (on top of the application-wide texts), the history and AI suggestions are per tenant, and export, import and "Add language" are turned off.

## Navigation and page

```php
TranslationManagerPlugin::make()
    ->navigationLabel('Copy')
    ->navigationGroup('Settings')
    ->navigationIcon('languages')
    ->navigationSort(90)
    ->registerNavigation(false)
    ->perPage(100)
    ->usingPage(MyTranslations::class); // a subclass of AlfaSix\AlfakitTranslationManager\Pages\Translations
```

## Security notes

- Access is denied unless `authorize()` or the `manageTranslations` gate allows it; every grid request and header action checks it again, and `editableLocales()` is enforced on the server.
- Keys are checked against the catalog (lang files, database and the last scan) and locale codes against a strict pattern, so a request can't create arbitrary files or write outside the lang directory.
- Translation texts are shown as text, never as HTML. Remember that your application may print some translations unescaped (`{!! __('…') !!}`): only give this page to people you'd let edit those templates.
- The history keeps who changed what (`alfakit_translation_revisions`); AI suggestions never apply without a person accepting them.
