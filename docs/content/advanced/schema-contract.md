---
title: Schema contract
description: The JSON produced by PHP and consumed by renderers.
---

# Schema contract

Every AlfaKit object serialises to plain JSON. Renderers are thin: they trust this contract and never derive business rules on their own. The TypeScript definitions in `@alfakit/core` (`packages/core/src/schema`) are the reference.

## Page props

```json
{
  "alfakit": { "id": "admin", "brandName": "Acme", "navigation": [...], "user": {...}, "endpoints": {...}, "localization": {...}, "translations": {...} },
  "page": {
    "layout": "app",
    "title": "Edit post",
    "breadcrumbs": [{ "label": "Posts", "url": "/admin/posts" }, { "label": "Edit" }],
    "headerActions": [{ "type": "Action", "name": "delete", "label": "Delete", "color": "danger", "hasModal": true }],
    "content": [
      { "type": "Form", "key": "form", "component": "form", "components": [...], "state": {...}, "actions": [...] },
      { "type": "RelationManagers", "managers": [{ "component": "relationManager:App\\...\\CommentsRelationManager", "table": {...} }] }
    ],
    "token": "eyJpdiI6..."
  }
}
```

`alfakit.navigation`, `endpoints`, `localization`, `translations`, `theme` and `commandPalette` are Inertia once props: the first page load carries them (listed in the page object's `onceProps`), and later visits leave them out while they are unchanged, so a renderer keeps the values it has.

`token` is an encrypted `SchemaContext` (panel id, page class, route parameters, component) that every internal request sends back. The server rebuilds the page from it, so a client cannot target classes it was not given.

## Components

Each component has `type`, `key`, optional `label`, `columns`, `columnSpan`, `schema` (children) and type-specific props. Fields add `name`, `statePath`, `required`, `live`, … Entries add `state`.

## Tables

A table block carries static column definitions, filter forms, the current state (`sort`, `search`, `filterState`), `records` (each with `cells` keyed by column name and per-row `actions`) and `pagination`. `sort` is the sort the query used: a sort column from the URL that is hidden, unknown or not sortable is ignored and the default sort is reported instead.

## Lazy components

On a full page response, lazy widgets and relation managers are placeholders with `lazy: true` (a widget keeps `type`, `id` and `columnSpan`; a relation manager keeps its `component`, `title`, `icon` and `badge`, without `table`). Their schemas come in the `alfakitLazy` Inertia deferred prop, keyed by poll target (`widget:<id>`, `relationManager:<class>`); `resolveLazyComponents()` from `@alfakit/core` puts them in place. Partial reloads of `page` send them complete.

## Form state

A form's `state` may carry the reserved key `__alfakitReadOnly`: an encrypted copy of values the server wrote into read-only fields during a live update. Send it back unchanged; the server drops it before validation.

Forms with live fields or field actions carry `fingerprints` (index path → `own:subtree` hash; `''` is the root). Send them back with a refresh (or a field action) and the response is partial: `{ partial: true, patches: [{ path: '0.2', component }], fingerprints, state, partialState, removedState }`, where `path` indexes `components[0].schema[2]` and, with `partialState`, `state` holds only the top-level keys that differ from the state you sent. `applySchemaPatches()` and `mergeRefreshResponse()` in `@alfakit/core` apply them.

Field actions are addressed as `component: 'field:{schema}::{key}'` (e.g. `field:form::author_id`, `field:action:table.edit::slug`) and answer with JSON: `{ status, result, closeModal, redirect, form }`, `form` being the refreshed form payload.

## Internal endpoints

| Endpoint                   | Method              | Purpose                                                                                 |
| -------------------------- | ------------------- | --------------------------------------------------------------------------------------- |
| `/_alfakit/actions`        | POST                | Run an action (`token`, `component`, `action`, `record`/`records`, `data`, `arguments`) |
| `/_alfakit/actions/modal`  | GET / POST          | Modal definition for an action (POST for field actions, which send `state`)             |
| `/_alfakit/schema/refresh` | POST                | Re-evaluate a form after a `live()` change                                              |
| `/_alfakit/schema/options` | GET                 | Searchable select options / labels, rich editor mention search and block previews       |
| `/_alfakit/table/cell`     | POST                | Inline column edit                                                                      |
| `/_alfakit/table/reorder`  | POST                | Persist drag-and-drop order                                                             |
| `/_alfakit/uploads`        | POST / DELETE       | Temporary file uploads                                                                  |
| `/_alfakit/global-search`  | GET                 | Global search                                                                           |
| `/_alfakit/notifications…` | GET / POST / DELETE | Database notifications                                                                  |
| `/_alfakit/locale`         | POST                | Switch language (`locale`); redirects back                                              |

Responses to action runs are Inertia redirects (back, or the action's success URL) carrying flashed notifications and an `alfakitAction` result (`success`, `halted`, `cancelled`).

## Localization

`alfakit.localization` describes the request's language and formats:

```json
{
    "code": "ar",
    "tag": "ar",
    "label": "العربية",
    "direction": "rtl",
    "fallbackLocale": "en",
    "firstDayOfWeek": 6,
    "currency": "BHD",
    "timezone": "Asia/Bahrain",
    "switcher": true,
    "locales": [
        { "code": "en", "tag": "en", "label": "English", "direction": "ltr" },
        { "code": "ar", "tag": "ar", "label": "العربية", "direction": "rtl" }
    ]
}
```

`alfakit.translations` holds the `alfakit::ui` strings plus any groups shared with `frontendTranslations()`. Renderers set `<html lang dir>` from `tag` and `direction` after every visit, use `tag` for `Intl` formatting and plural rules, and pass `direction` to their UI primitives. Values the server formats (columns, entries, dates) arrive already localised.

## Versioning

The contract has its own version: `SchemaContract::VERSION` in PHP (shared with every page as `alfakit.schemaContract`) and `SCHEMA_CONTRACT_VERSION` in `@alfakit/core`. Within a major version new props are additive and renderers ignore unknown props; when the major parts differ, renderers show a translated message instead of the page and log both versions. See [Stability and upgrades](./stability).
