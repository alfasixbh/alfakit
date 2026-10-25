---
title: Translatable content
description: Edit one value per language for a field and store them as JSON, with or without spatie/laravel-translatable.
---

# Translatable content

Mark a `TextInput`, `Textarea` or `RichEditor` as translatable and it edits one value per language. A language switcher sits above the field; the selected language's input carries the right `lang` and `dir` attributes, so Arabic or Hebrew text is written right to left in an otherwise left-to-right form (and the other way round).

```php
TextInput::make('title')
    ->required()
    ->maxLength(120)
    ->translatable(),

RichEditor::make('body')->translatable(locales: ['en', 'ar', 'fr']),
```

The languages default to the panel's [`locales()`](overview), in admin panels and starter kits alike. [Outside panels](../standalone/overview) there is no panel, so a field offers only the app's current language until you pass `locales:`. Pass `locales:` as codes, `code => label` pairs or `Locale` objects to choose others for one field.

## State and storage

The field's state is an object keyed by language: `['en' => 'Hello', 'ar' => 'مرحبا']`. On save:

| Model attribute                                                                                                | Stored as                                                            |
| -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Cast as `array`, `json`, `object`, `collection`, `AsArrayObject`, `AsCollection` (or encrypted)                | The array; empty languages are left out                              |
| A plain text column without a cast                                                                             | A JSON string (`{"en":"Hello","ar":"مرحبا"}`); `null` when all empty |
| A `HasTranslations` attribute of [spatie/laravel-translatable](https://github.com/spatie/laravel-translatable) | The array, every language included, so emptied languages are cleared |
| A nested path (`meta.title`) or a form without a model                                                         | The array                                                            |

When the form loads, values are read with `getTranslations()` for spatie models (so every language is edited, not only the current one), decoded from JSON strings, and a legacy plain string becomes the default language's value. Spatie is optional: Alfakit only calls its methods when the model has them.

Languages the field doesn't edit (say, one you removed from the panel) keep their stored value. They are taken from the record, never from the browser, and a language the browser invents is ignored.

## Validation

- `required()` applies to the **required languages**: the panel's default locale, or the ones you list with `->requiredLocales(['en', 'ar'])`. Each required language's input is marked as required.
- Every other rule (`maxLength()`, `rules()`, `regex()`…) applies to each language. Errors are reported per language (`title.ar`) with the language in the attribute name ("The title (العربية) field is required"), the switcher marks languages with errors, and the first of them opens after a failed submit.
- The value must be an object; anything else fails validation.

`unique()` on a translatable field compares the whole JSON value; write a custom rule if you need per-language uniqueness.

## Reactivity

`live()` and `afterStateUpdated()` work as usual: changing any language runs the field's hooks with the whole object as `$state`.

```php
TextInput::make('title')
    ->translatable()
    ->live(onBlur: true)
    ->afterStateUpdated(fn (Set $set, array $state) => $set('slug', str($state['en'] ?? '')->slug()));
```

## Displaying translations

Tables and infolists show whatever the attribute returns. With spatie, `TextColumn::make('title')` shows the current locale's value. For an array-cast column without spatie, pick the language from the record yourself (a text column treats an array state as a list and formats each value on its own, so `formatStateUsing()` receives strings, not the array):

```php
TextColumn::make('title')->getStateUsing(fn (Post $record) => $record->title[app()->getLocale()] ?? $record->title['en'] ?? null);
```

## Editing language for the whole page

Every translatable field opens on the panel's default language. Add a `LocaleSwitcher` to a page's header actions to let users pick the language they are editing in; the choice is kept in the session per panel, and every translatable field on every page opens on it (fields that don't offer that language fall back to their default):

```php
use AlfaSix\Alfakit\Actions\LocaleSwitcher;

protected function getHeaderActions(): array
{
    return [LocaleSwitcher::make(), DeleteAction::make()];
}
```

`LocaleSwitcher::make(['en', 'fr'])` (or `code => label` pairs, or `Locale`s) offers other languages than the panel's. Read or set the editing language yourself with `AlfaSix\Alfakit\Localization\TranslatableLocale::get()` / `::set('fr')`.

## Limitations

`MarkdownEditor` is translatable like the other text fields (the editor is rendered per language, from the Markdown of that language). Other field types don't have `translatable()`.

## Renderer details

The field's schema carries `translatable: { locales: [{ code, tag, label, direction, required }], defaultLocale }` and no `required` of its own; `defaultLocale` is the language the field opens on (the `LocaleSwitcher` choice when the field offers it). A translatable `MarkdownEditor` sends `html` as `{ [code]: html }` and `translatableLocaleField()` picks the current language's document. Each renderer wraps the registered field component in a switcher (`data-slot="translatable-field"`, `data-slot="translatable-locales"`) and renders it with the schema from `translatableLocaleField()` in `@alfakit/core`, bound to `{statePath}.{code}`. Custom field components work the same way when their PHP class uses the `CanBeTranslatable` trait.
