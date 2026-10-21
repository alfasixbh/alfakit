---
title: Localization
description: Run a panel in any number of languages, with automatic language detection, a language menu and per-user preferences.
---

# Localization

AlfaKit panels can be shown in any language, including right-to-left ones. Every built-in string goes through Laravel's translator, dates use Carbon's localized formats, and numbers and money use PHP's intl extension. Nothing is hardcoded to English or to a region.

## Enable languages

List the languages a panel offers with `locales()`. Codes follow Laravel's style (`en`, `pt_BR`, `zh_Hant`); hyphenated tags such as `pt-BR` work too.

```php
use AlfaSix\Alfakit\Panel;

public function panel(Panel $panel): Panel
{
    return $panel
        ->locales(['en', 'ar', 'fr', 'de', 'ja', 'pt_BR'])
        ->defaultLocale('en');
}
```

That is all you need. With more than one locale, a **Language** menu appears in the user menu and on the sign-in pages (move it to the top bar with `->languageSwitcher('topbar')`, see [Where the menu sits](#where-the-menu-sits)). Each language is listed by its own name (Deutsch, العربية, 日本語), and its writing direction is detected automatically.

Install the language packs for the built-in strings:

```bash
composer require alfasix/alfakit-translations
```

The package ships translations for Arabic, Chinese (Simplified), Dutch, French, German, Italian, Japanese, Persian, Portuguese (Brazil), Russian, Spanish and Turkish, and registers itself automatically. For any other language, see [Adding a language](adding-a-language).

Form validation messages ("The slug field is required.") are Laravel's own and come from your app's `lang/{locale}/validation.php`. A fresh Laravel app only has English ones, so add the other languages' files, for example with [Laravel Lang](https://laravel-lang.com) (`composer require laravel-lang/common --dev` and `php artisan lang:add ar`). Field names in the messages use the fields' labels, so they follow the panel language once the labels are translated.

## Customise a locale

Pass `Locale` objects when you need to change what is derived automatically:

```php
use AlfaSix\Alfakit\Localization\Locale;
use AlfaSix\Alfakit\Localization\TextDirection;

$panel->locales([
    'en',
    Locale::make('ar')->label('العربية (البحرين)')->firstDayOfWeek(6),
    Locale::make('ku_Arab')->direction(TextDirection::Rtl),
    'pt_BR' => 'Português',            // code => label shorthand
]);
```

| Method             | Default                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `label()`          | The language's own name from ICU, e.g. `Deutsch`                                                                   |
| `direction()`      | Detected from the script, see [Right-to-left languages](rtl)                                                       |
| `firstDayOfWeek()` | From ICU for the language's main region (Saturday for Arabic, Sunday for Hebrew and US English, Monday for German) |

`locales()` also accepts a closure, so languages can depend on the tenant or the user.

## How the language is chosen

For each request, the first match wins:

1. A `resolveLocaleUsing()` callback, if you set one.
2. The language picked in the menu during this session.
3. The signed-in user's preference: Laravel's `HasLocalePreference::preferredLocale()`.
4. The `alfakit_locale` cookie, which remembers the choice for guests.
5. The browser's `Accept-Language` header. Turn this off with `->detectBrowserLocale(false)`.
6. The panel's default locale.

Candidates are matched loosely. A browser asking for `ar-BH` gets `ar` when that is what the panel offers, and `pt` gets `pt_BR` when only the Brazilian variant is available.

The chosen locale is applied to the whole request. It sets `app()->setLocale()`, Carbon's locale and Laravel's `Number` defaults. The response also gets a `Content-Language` header, and the page gets `<html lang dir>`.

### Remember each user's language

Store the choice on the user and read it back through Laravel's contract:

```php
// Migration
$table->string('locale', 20)->nullable();

// App\Models\User
use Illuminate\Contracts\Translation\HasLocalePreference;

class User extends Authenticatable implements HasLocalePreference
{
    public function preferredLocale(): ?string
    {
        return $this->locale;
    }
}

// Panel
$panel->persistLocaleUsing(fn (User $user, string $locale) => $user->update(['locale' => $locale]));
```

`HasLocalePreference` is the same contract Laravel uses for mail and notifications, so emails go out in the user's language too.

To add a language field to a profile or user form, use the panel's languages as options:

```php
Select::make('locale')->label(__('Language'))->panelLocales();
```

### Your own resolution rules

```php
$panel->resolveLocaleUsing(function (Request $request, array $locales): ?string {
    return $request->user()?->team?->locale; // null falls back to the normal order
});
```

### Where the menu sits

By default the language menu is a **Language** submenu of the user menu. Users find it faster as a button in the top bar, next to the theme switcher:

```php
use AlfaSix\Alfakit\Support\Enums\LanguageSwitcherPosition;

$panel->languageSwitcher('topbar');                          // or LanguageSwitcherPosition::Topbar
$panel->languageSwitcher(LanguageSwitcherPosition::Both);    // top bar button and user menu
```

| Position                | Shows the menu in                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| `'user-menu'` (default) | The user menu's **Language** submenu                                                     |
| `'topbar'`              | A languages button in the top bar (and the top navigation, full-screen and phone bars)   |
| `'both'`                | Both places                                                                              |
| `'hidden'`              | Neither; the language comes from the browser, the session or the user's saved preference |

The top bar button lists every language in its own name with the current one checked; each entry carries its `lang` and `dir`, so Arabic and Persian names render right to left. Picking one posts to the panel's locale endpoint, saves the choice with `persistLocaleUsing()` when set, and reloads the page in the new language. Sign-in, registration and password reset pages keep their own language button whatever the position. A sidebar panel with `topbar(false)` and `languageSwitcher('topbar')` shows the button on the phone bar and keeps the user menu entry on larger screens. On phones (below the `sm` breakpoint) the top bar button of `'topbar'` and `'both'` moves into the user menu, so a crowded top bar still fits a 375 px screen; panels without a user menu (guests, `userMenu(false)`) keep the button.

The button is the `panel:language-switcher` registry key (`data-slot="language-switcher"`): replace it with `createAlfakit({ components: { 'panel:language-switcher': MyLanguageMenu } })` or eject it with `php artisan alfakit:eject panel:language-switcher`. Frontend code can ask `showsLanguageSwitcher(localization, 'topbar' | 'user-menu' | 'auth')` and `collapsesLanguageSwitcher(localization, hasUserMenu)` from `@alfakit/core`.

### Hide the menu

The menu shows automatically when a panel has more than one locale. Use `->localeSwitcher(false)` to hide it everywhere, including the sign-in pages, for example when the language comes only from the user's profile; `->languageSwitcher('hidden')` hides it inside the panel only.

## Translate your own labels

Labels you write are passed through as you write them. Wrap them in `__()` to translate them with your app's language files:

```php
TextInput::make('title')->label(__('posts.fields.title'));
```

Labels generated from column names (`published_at` becomes "Published at") can be translated too. With `translateLabel()`, the generated text is looked up in your JSON language files, such as `lang/fr.json` containing `{"Published at": "Publié le"}`. Call it on a component, or turn it on for every field:

```php
use AlfaSix\Alfakit\Forms\Components\Field;

Field::configureUsing(fn (Field $field) => $field->translateLabel());
```

Resource names are generated from the model class, with correct plurals in English ("category", "categories"). Translate them in a `models` file per language:

```php
// lang/fr/models.php
return [
    'category' => ['singular' => 'catégorie', 'plural' => 'catégories'],
    'blog_post' => 'article|articles',   // singular|plural shorthand
];
```

The navigation, titles, buttons, breadcrumbs and relation managers all follow it, and URLs stay in English. See [Singular and plural labels](../resources/overview#singular-and-plural-labels).

## Strings in custom frontend components

Built-in frontend strings come from the `alfakit::ui` group. To use your own strings in [custom components](../adapters/custom-components), share their groups with the frontend:

```php
$panel->frontendTranslations([
    'billing' => 'billing',           // lang/{locale}/billing.php → t('billing.…')
    'maps' => 'maps::ui',             // a plugin's namespace
]);
```

Then read them in any adapter:

```tsx
const t = useT()
const choice = useChoice()

t('billing.invoice_title') // simple line
t('billing.due', { date: '3 May' }) // :date placeholder
choice('billing.items', count) // plural forms
```

`choice()` understands Laravel's `trans_choice()` syntax: explicit values (`{0} None|{1} One|[2,*] :count`) and plain forms (`one item|:count items`). Plain forms follow the CLDR plural rules of the current language, in the order zero, one, two, few, many, other. That is the same order Laravel language files use, so Arabic can have all six forms and Japanese just one.

Placeholders work as in Laravel. `:name` stays as given, `:Name` capitalises the first letter, and `:NAME` upper-cases the value.

## Related

- [Adding a language](adding-a-language)
- [Right-to-left languages](rtl)
- [Currencies, numbers and dates](currencies-and-numbers)
