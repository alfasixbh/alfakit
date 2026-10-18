---
title: Introduction
description: What AlfaKit is, how it works and when to use it.
---

# Introduction

AlfaKit is an admin panel builder for Laravel. You describe **panels**, **resources** (CRUD for an Eloquent model), **forms**, **tables**, **actions**, **widgets** and **pages** with a fluent PHP API, and AlfaKit renders them with the JavaScript framework your application already uses — React, Vue or Svelte — through [Inertia.js](https://inertiajs.com) and shadcn-style components.

> **Beta:** AlfaKit 0.1 is a public beta. Public APIs may still change before 1.0, so pin your versions (see [Installation](installation#versions-during-the-beta)) and read the [changelog](/changelog) before you update. AlfaKit is open source under the MIT License.

```php
Select::make('status')
    ->options(['draft' => 'Draft', 'published' => 'Published'])
    ->live()
    ->afterStateUpdated(fn (Set $set, string $state) => $state === 'published' ? $set('published_at', now()) : null);
```

## How it works

1. **PHP builds a schema.** Every component (`TextInput`, `Section`, `TextColumn`, `DeleteAction`, …) serialises itself into a plain array through `toSchema()`. A page assembles those arrays into Inertia props.
2. **The renderer turns the schema into components.** `@alfakit/react`, `@alfakit/vue` and `@alfakit/svelte` each ship a registry that maps a schema `type` (for example `"TextInput"`) to a component. Rendering is purely declarative; there is no business logic in JavaScript.
3. **Interactions go back to the server.** Submitting a form, running an action, searching a select, toggling a table cell or reacting to a `live()` field calls small internal endpoints (`/_alfakit/*`) that rebuild the same PHP objects, validate, authorise and respond. An encrypted _context token_ identifies which page and component the request belongs to, so clients cannot reference arbitrary classes.

The result is a Filament-style PHP API rendered by the frontend framework your application already uses, with a single source of truth for validation, authorisation and queries. The API is inspired by [Filament](https://filamentphp.com), and we are grateful to Dan Harrin, the Filament team and its contributors for their work; [Coming from Filament](filament-comparison) maps one to the other.

## Why Inertia instead of Livewire?

Livewire is a great choice when your application is Blade-based. AlfaKit exists for teams who have standardised on the Laravel starter kits with React, Vue or Svelte and want their admin panel to share the same stack, components, theme and build pipeline as the rest of the app — without writing the admin UI by hand.

## What's in the box

| Area       | Highlights                                                                                                                                                                                         |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Panels     | Multiple panels, auth, branding, dark mode, navigation groups, global search, user menu, database notifications                                                                                    |
| Resources  | List / create / edit / view pages, relation managers, soft deletes, policies, global search                                                                                                        |
| Forms      | 18 fields, sections, tabs, wizards, repeaters, file uploads, rich text, relationship-aware saving, server-side reactivity                                                                          |
| Tables     | Sorting, searching, filters, bulk actions, inline editing, reordering, polling, column toggling                                                                                                    |
| Actions    | Buttons, groups, confirmation modals, modal forms, slide-overs, hooks, keyboard shortcuts                                                                                                          |
| Dashboards | Stats, Chart.js charts, table widgets, custom widgets                                                                                                                                              |
| Platform   | Notifications, multi-tenancy, plugins, generators, caching                                                                                                                                         |
| Design     | Six themes that change structure and style (sidebar, top navigation, icon rail; navigation, headers, cards, inputs, buttons, tables), including a Filament-style theme; slots; replaceable layouts |
| Global     | Any number of languages with auto-detection and a language menu, full right-to-left support, every currency, per-user timezones                                                                    |

## Supported stack

AlfaKit v1 supports PHP 8.3+, Laravel 13 and Inertia.js 3 with Tailwind CSS 4. Each renderer tracks its ecosystem: React 19 with shadcn/ui, Vue 3.5 with shadcn-vue, Svelte 5 with shadcn-svelte.
