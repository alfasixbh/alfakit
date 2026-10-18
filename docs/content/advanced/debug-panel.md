---
title: Debug panel
description: A developer drawer in the top bar with the resolved schema tree, visibility and authorisation per component, form state, internal requests and timings.
---

# Debug panel

While you develop, a bug icon in the top bar opens a drawer that shows what the server resolved for the current page:

- **Schema** — the page tree as PHP built it: header actions, the form (with its operation), infolist, table (columns, filters, record, bulk and empty-state actions), widgets and relation managers. Hidden nodes are struck through with the reason (`hidden()`, `visible(false)`, `hiddenOn(edit)`, `toggled off`, `canView() returned false`), unauthorised actions, widgets and relation managers get a red badge, and fields show their state path.
- **Form** — the live state of every form store on the page (page forms, filter forms, modal forms): values, dirty paths, validation errors and whether a live refresh is running.
- **Requests** — every internal request the renderer made through the core HTTP helper (`/_alfakit/*`: actions, live refreshes, select options, uploads, table cells), newest first, with status, browser time, server time from the `Server-Timing` header, request and response sizes, and both bodies.
- **Timings** — server time of the page request, number and time of database queries, peak memory, size of the page payload, PHP and Laravel versions, and the list of configuration closures that ran while building the page (owner, file, line, how many times), so a closure that runs 200 times stands out.

## Enabling it

The panel is on when `app.debug` is on and the panel enables it; it is enabled by default in the `local` environment.

```php
$panel->debugPanel();                                   // whenever app.debug is on
$panel->debugPanel(fn (?User $user) => $user?->isDeveloper());
$panel->debugPanel(false);                              // never, even locally
```

Everything the drawer shows travels in an extra Inertia prop, `alfakitDebug` (`Page::DEBUG_PROP`), which PHP adds to the page only while `Panel::hasDebugPanel()` is true. With `app.debug` off the prop is never added, whatever the panel says, so a production deployment cannot expose it through configuration alone; the `Server-Timing` header is only sent in the same condition, and the browser-side recorder (requests, form stores) only starts on pages that carry the prop. Nothing in the drawer comes from JavaScript re-evaluating your PHP: visibility and authorisation are the results PHP computed for the response.

## In tests

`PageTester` prints the same tree:

```php
alfakit()->testPage(EditPost::class, ['record' => $post])->dump();   // print and continue
alfakit()->testPage(EditPost::class, ['record' => $post])->dd();     // print and stop
$tree = alfakit()->testPage(ListPosts::class)->getDebugTree();     // the raw array
```

```text
App\Alfakit\Resources\PostResource\Pages\EditPost
├─ HeaderActions headerActions
│  └─ Action delete "Delete"  [hidden: unauthorized, unauthorized]
├─ Form form  [operation: edit]
│  ├─ Section section-0 "Content"
│  │  ├─ TextInput title "Title"  [statePath: title]
│  │  └─ Toggle is_published "Published"  [hidden: visibleOn(create), statePath: is_published]
│  └─ Action save "Save changes"
└─ RelationManagers relationManagers
   └─ RelationManager comments "CommentsRelationManager"

Closures evaluated:
  DeleteAction[delete]  vendor/alfasix/alfakit/src/Actions/DeleteAction.php:33  ×3

Server: 2.2ms, 3 queries (0.4ms), 56.5 MB peak memory
```

Tests do not need the debug panel enabled: the tester asks for the tree with an `X-Alfakit-Debug` header that the server only honours while running tests (`app()->runningUnitTests()`).

## Replacing the drawer

The toggle and drawer are one component, registered as `panel:debug-panel`; replace it like any panel part: `createAlfakit({ components: { 'panel:debug-panel': MyDebugPanel } })`. It reads `usePage().props.alfakitDebug` (`DebugSchema` in `@alfakit/core`) and the shared `debugRecorder` store (`requests`, `forms`).
