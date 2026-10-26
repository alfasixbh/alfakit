---
title: Server-side rendering
description: Render panel pages on the server with Inertia SSR, for React, Vue and Svelte.
---

# Server-side rendering

Panels render in the browser by default. With server-side rendering (SSR) turned on, the first page of a visit arrives as finished HTML (the login form, the table, the form fields) and the browser hydrates it instead of building it from scratch. Later visits are ordinary Inertia visits.

SSR is opt-in. It uses Inertia's own SSR server, so the setup is the same as for any Inertia app: an SSR entry, an SSR build and a running Node process.

## Setup

New installs can do all of this with one flag:

```bash
php artisan alfakit:install --ssr
```

It writes `resources/js/alfakit/ssr.tsx` (`ssr.ts` for Vue and Svelte), points `vite.config` at it and adds a `build:ssr` script. To set it up by hand, follow the steps below. `--ssr` sets up the admin panel's entry only: combined with `--starter-kit` or `--standalone` it changes nothing and prints a note, because those pages render through your app's own Inertia entry (see [Starter kits and standalone pages](#starter-kits-and-standalone-pages)).

### 1. The SSR entry

Each renderer has a server entry, `@alfakit/react/server`, `@alfakit/vue/server` and `@alfakit/svelte/server`. `createAlfakitServer()` takes the same options as `createAlfakit()` and returns the render callback for Inertia's `createServer()`:

```tsx
// resources/js/alfakit/ssr.tsx
import createServer from '@inertiajs/react/server'
import { createAlfakitServer } from '@alfakit/react/server'

createServer(
    createAlfakitServer({
        // The same components and pages as in app.tsx, for example:
        // components: { 'map-picker': MapPicker },
        // pages: { 'Custom/Reports': ReportsPage },
    }),
)
```

For Vue, import `createServer` from `@inertiajs/vue3/server` and `createAlfakitServer` from `@alfakit/vue/server`. For Svelte, use `@inertiajs/svelte/server` and `@alfakit/svelte/server`.

Pass the same `discover` glob ([auto-registered components](./custom-components)) and register the same `components` and `pages` as in `resources/js/alfakit/app.*`; discovered components a page uses load before it renders, so they are in the server markup. The server and the browser must render the same tree, or the browser throws the server markup away. To avoid listing them twice, export the options from a shared module and import it in both entries.

`createAlfakit()` needs no change: when the page arrives with server-rendered markup, it hydrates that markup.

### 2. Vite

Point laravel-vite-plugin and `@inertiajs/vite` at the entry (`alfakit:install --ssr` does this, and installs `@inertiajs/vite` when the app doesn't have it):

```ts
// vite.config.ts
laravel({
    input: ['resources/css/alfakit.css', 'resources/js/alfakit/app.tsx'],
    ssr: 'resources/js/alfakit/ssr.tsx',
}),
inertia({ ssr: 'resources/js/alfakit/ssr.tsx' }),
```

Then build both bundles:

```json
"scripts": {
    "build:ssr": "vite build && vite build --ssr"
}
```

`vite build --ssr` writes `bootstrap/ssr/ssr.js`, which Inertia finds on its own.

During development (`npm run dev`), `@inertiajs/vite` renders through the Vite dev server, so no separate SSR process is needed.

### 3. Run the SSR server

```bash
php artisan inertia:start-ssr
```

Keep this process running in production, for example with Supervisor, next to your queue workers. `config/inertia.php` controls the rest: `ssr.enabled` (`INERTIA_SSR_ENABLED` in Inertia's own config) and `ssr.url` (`INERTIA_SSR_URL`, `http://127.0.0.1:13714` by default). Apps made from a Laravel starter kit may ship a `config/inertia.php` with `'enabled' => true` and no environment lookup, so `INERTIA_SSR_ENABLED=false` changes nothing and, while `npm run dev` runs, every page is rendered on the server through the Vite dev server. To switch SSR with the environment, make it `'enabled' => (bool) env('INERTIA_SSR_ENABLED', true)`. AlfaKit leaves the file alone: it is your app's configuration. When the SSR server is down or a render fails, Inertia falls back to rendering in the browser, so a page never breaks because of SSR.

## Pages outside the panel

The SSR server renders every Inertia page of the app. `createAlfakitServer()` renders the pages that carry the shared `alfakit` prop and the pages you registered with `pages` (they render inside the same providers as in the browser, so an `<AlfakitComponent>` on them is server-rendered too). For any other page it returns `null`, which tells Laravel to render it in the browser. To server-render the rest of your app from the same process, pass its render callback as `fallback`:

```tsx
import { createInertiaApp } from '@inertiajs/react'
import createServer from '@inertiajs/react/server'
import type { ComponentType } from 'react'
import { renderToString } from 'react-dom/server'
import { createAlfakitServer } from '@alfakit/react/server'

const appPages = import.meta.glob<{ default: ComponentType }>('../pages/**/*.tsx', { eager: true })

createServer(
    createAlfakitServer({
        fallback: (page) =>
            createInertiaApp({
                page,
                render: renderToString,
                resolve: (name) => appPages[`../pages/${name}.tsx`].default,
                setup: ({ App, props }) => <App {...props} />,
            }),
    }),
)
```

The same for Vue (`resources/js/alfakit/ssr.ts`):

```ts
import { createInertiaApp } from '@inertiajs/vue3'
import createServer from '@inertiajs/vue3/server'
import { createSSRApp, h, type DefineComponent } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createAlfakitServer } from '@alfakit/vue/server'

const appPages = import.meta.glob<{ default: DefineComponent }>('../pages/**/*.vue', {
    eager: true,
})

createServer(
    createAlfakitServer({
        fallback: (page) =>
            createInertiaApp({
                page,
                render: renderToString,
                resolve: (name) => appPages[`../pages/${name}.vue`],
                setup: ({ App, props, plugin }) =>
                    createSSRApp({ render: () => h(App, props) }).use(plugin),
            }),
    }),
)
```

And for Svelte:

```ts
import { createInertiaApp, type ResolvedComponent } from '@inertiajs/svelte'
import createServer from '@inertiajs/svelte/server'
import { render } from 'svelte/server'
import { createAlfakitServer } from '@alfakit/svelte/server'

const appPages = import.meta.glob<ResolvedComponent>('../pages/**/*.svelte', { eager: true })

createServer(
    createAlfakitServer({
        fallback: (page) =>
            createInertiaApp({
                page,
                resolve: (name) => appPages[`../pages/${name}.svelte`],
                setup: ({ App, props }) => render(App, { props }),
            }),
    }),
)
```

Give the fallback the same `title` and `layout` options as your app's browser entry, so the server renders the tree the browser hydrates.

## Starter kits and standalone pages

In a [starter kit app](../getting-started/starter-kits) and on pages that embed [`<AlfakitComponent>`](../standalone/overview), AlfaKit's pages are pages of your own Inertia app: your app's entry renders them in the browser, and your app's own SSR setup renders them on the server, for React, Vue and Svelte alike. `createAlfakitServer()` is not involved and the SSR setup needs no AlfaKit change: follow [Inertia's SSR guide](https://inertiajs.com/server-side-rendering) for your app (the Laravel starter kits come with a `build:ssr` script, then run `php artisan inertia:start-ssr`). The starter kit page and `<AlfakitComponent>` are SSR-safe ([Customizing standalone components](../standalone/customizing#server-side-rendering)); `config/inertia.php` switches SSR on and off as described above.

## What renders on the server

The whole page renders on the server: the layout, navigation, breadcrumbs, forms, tables, infolists and stats widgets. These parts wait for the browser:

- **Charts and rich editors** render their placeholder on the server. Chart.js and Tiptap load in the browser and replace it.
- **Icons loaded on demand** (any Lucide icon named from PHP) appear once their chunk loads, on the server and in the browser alike.
- **Shortcut hints** such as the global search key (⌘K or Ctrl+K) depend on the visitor's platform, so they appear after hydration.
- **The mobile layout** starts as desktop and switches after hydration on narrow screens.
- **Polling, notifications and toasts** start in the browser only.
- **Long lists** (Repeater and Builder items, table rows above the [virtualisation](/docs/advanced/performance) threshold) render their first window on the server; the rest appears as the visitor scrolls.

The server already knows the visitor's colour scheme and sidebar state: the `alfakit_appearance` cookie sets `class="dark"` on `<html>`, and the `alfakit_sidebar_state` cookie reaches the renderers as the `alfakitSidebarOpen` prop, so the sidebar renders expanded or collapsed on the first paint.

## Writing SSR-safe components

Your own components (custom fields, entries, widgets, pages) render on the server too. Node has no `window`, `document`, `localStorage` or `matchMedia`:

- Touch browser APIs in `useEffect` (React), `onMounted` (Vue) or `$effect` / `onMount` (Svelte), never while rendering or at import time.
- Render the same markup on the server and in the first browser render. For values only the browser knows, render a neutral version first. Each renderer exports `useHydrated()`, which is `false` on the server and during hydration and `true` afterwards:

```tsx
import { useHydrated } from '@alfakit/react'

function LocalTime({ iso }: { iso: string }) {
    const hydrated = useHydrated()

    return <time dateTime={iso}>{hydrated ? new Date(iso).toLocaleTimeString() : iso}</time>
}
```

In Vue `useHydrated()` returns a ref. In Svelte it returns `{ current }`.

- Format dates, numbers and money with `useFormatter()`. It follows the panel's locale and timezone, so the server and the browser print the same text.
- Generate ids with `useId()` (React) or the ids your UI library provides, not `Math.random()`.

## Linked packages and monorepos

`vite build --ssr` leaves `node_modules` packages external by default. When `@alfakit/*` is installed from npm, that works as is. When the renderer is linked from a workspace, its dependencies would resolve from the app's `node_modules`, which may hold other versions, and the server markup would stop matching the browser. Bundle everything into the SSR build instead:

```ts
export default defineConfig({
    ssr: { noExternal: true },
})
```
