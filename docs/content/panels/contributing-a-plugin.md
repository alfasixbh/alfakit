---
title: Contributing a plugin
description: Publish an AlfaKit plugin, declare the versions and renderers it supports, and list it in the plugin directory.
---

# Contributing a plugin

A plugin is a Composer package (and, when it ships renderer components, an npm package) that other AlfaKit apps install. This page covers what to do once the plugin works in your own app: make it installable, declare what it supports, and list it in the [plugin directory](/plugins). How to write the plugin itself is in [Plugins](plugins).

## Start from the generator

```bash
php artisan make:alfakit-plugin Blog --vendor=acme --frontend=react
```

The generator writes `packages/blog` with a `composer.json` that already contains the compatibility declaration below, a plugin class, a service provider that loads `resources/lang`, and with `--frontend` a small package exporting `components` for that renderer. Use `--frontend=none` for a PHP-only plugin.

## Declare compatibility

```json
{
    "require": {
        "alfasix/alfakit": "^1.0"
    },
    "extra": {
        "alfakit": {
            "version": "^1.0",
            "frontend": "@acme/blog"
        }
    }
}
```

- `version` is the Composer constraint on `alfasix/alfakit` your plugin supports, usually the same as the `require` entry.
- `frontend` is the npm package with your renderer components; omit it for a PHP-only plugin.

`php artisan alfakit:upgrade` reads these declarations in your users' apps and reports each plugin as compatible, incompatible or unknown. Release the PHP and npm packages with the same major version so the check stays meaningful. See [Declaring compatibility](plugins#declaring-compatibility).

## Support every renderer you can

A plugin that only adds PHP (resources, pages, policies, translations, schema components built from existing fields) works with React, Vue and Svelte without extra work, because the renderers only see the schema.

A plugin with its own frontend components needs one component per renderer it supports, registered under the same name:

```ts
// React, Vue and Svelte entries of the app that installs the plugin
createAlfakit({ components: { 'blog-stats': BlogStats } })
```

List the renderers you ship components for in the directory entry, and say in your README how users register them.

## Follow the AlfaKit conventions

- Keep logic in PHP: validation, queries and authorisation run on the server; components only display the schema.
- Make every string translatable and ship at least English in `resources/lang`.
- Use logical CSS (`ms-*`, `ps-*`, `text-start`) so the plugin works right to left.
- Test with `alfakit()->testPage()` (see [Testing](../advanced/testing)).

## List it in the directory

The directory at [/plugins](/plugins) is rendered from `docs/content/plugins.json` in the AlfaKit repository. Add an entry with a pull request:

```json
{
    "name": "Blog",
    "package": "acme/alfakit-blog",
    "description": "Posts, categories and an editor page for AlfaKit panels.",
    "author": { "name": "Acme", "url": "https://acme.example" },
    "category": "other",
    "renderers": ["react", "vue", "svelte"],
    "alfakit": "^1.0",
    "links": {
        "repository": "https://github.com/acme/alfakit-blog"
    }
}
```

`category` is one of the keys in the file's `categories` object, `renderers` lists `react`, `vue` and/or `svelte`, and `alfakit` repeats your `extra.alfakit.version`. `links.repository` is required; `docs`, `packagist` and `npm` are optional. The docs app's test suite (`php artisan test` in `docs/`) checks each entry. The [submission page](/plugins/submit) has the full field list.
