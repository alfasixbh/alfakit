# Alfakit end-to-end tests

Playwright specs that drive the three playground applications (React, Vue and Svelte) through
a real browser. The same spec files run against every renderer: each renderer is a Playwright
project with its own base URL and stored sign-in.

## Running locally

The suite targets the Herd sites (`http://alfakit-react.localhost`, `http://alfakit-vue.localhost`,
`http://alfakit-svelte.localhost`) with the seeded user `admin@example.com` / `password`, and uses
the Google Chrome that is already installed (`channel: 'chrome'`), so no browser download is
needed:

```bash
pnpm e2e                                  # all three renderers
E2E_RENDERERS=react pnpm e2e              # one renderer
E2E_RENDERERS=vue,svelte pnpm e2e -- posts-form   # one spec
pnpm --filter @alfakit/e2e e2e:ui         # Playwright UI mode
```

Rebuild the renderer and playground first when you changed the frontend
(`pnpm build && pnpm --filter @alfakit/playground-react build`): the sites serve the built
assets from `public/build`.

Without Google Chrome, install Playwright's Chromium once and point the suite at it:

```bash
pnpm --filter @alfakit/e2e exec playwright install chromium
E2E_BROWSER_CHANNEL=chromium pnpm e2e
```

Environment variables: `E2E_REACT_URL`, `E2E_VUE_URL`, `E2E_SVELTE_URL` (base URLs),
`E2E_RENDERERS` (comma separated subset), `E2E_BROWSER_CHANNEL` (`chrome` by default),
`E2E_EMAIL` / `E2E_PASSWORD`.

## What is covered

| Spec                      | Flow                                                                                                            |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `login.spec.ts`           | Wrong credentials show an error; right ones sign in; guests are redirected                                      |
| `dashboard.spec.ts`       | Panel shell, widgets, sidebar navigation landmark                                                               |
| `posts-table.spec.ts`     | Search, sort (`aria-sort` and URL), pagination                                                                  |
| `posts-form.spec.ts`      | Create with a validation error then success; edit with a `live()` field; file upload                            |
| `actions.spec.ts`         | Record action with confirmation modal (focus, Escape, confirm); bulk action on selected rows                    |
| `theme.spec.ts`           | Theme switch (playground picker) and dark mode toggle                                                           |
| `locale.spec.ts`          | Switch to Arabic (RTL, `dir="rtl"`) and back                                                                    |
| `contact.spec.ts`         | Standalone `/contact` form outside the panel: validation, live field, submit                                    |
| `a11y.spec.ts`            | axe-core WCAG 2.1 A/AA (with colour contrast) on the main pages                                                 |
| `every-page.spec.ts`      | Every sidebar page and each resource's create, edit and view page opens with no browser error                   |
| `docs-forms.spec.ts`      | Field types, repeaters, builders, editors, uploads and validation from the forms docs                           |
| `docs-tables.spec.ts`     | Search, sort, filters, grouping, summaries, column manager, views, inline edits, infolists                      |
| `docs-panels.spec.ts`     | Actions, notifications, widgets, navigation, tenancy, resources, impersonation, the portal                      |
| `docs-plugins.spec.ts`    | The main flow of each plugin page (kanban, calendar, CMS, forms, helpdesk, invoices, …)                         |
| `docs-gallery.spec.ts`    | Wizard, tabs, pickers, masks, locks, editable columns, slide-over and grouped actions                           |
| `docs-standalone.spec.ts` | Standalone table, AuthKit pages, every theme (light, dark); every language with `E2E_LOCALES=1`                 |
| `ssr.spec.ts`             | With `E2E_SSR=1`: pages arrive server-rendered and hydrate without a mismatch                                   |
| `realtime.spec.ts`        | With `E2E_REALTIME=1`: live tables, presence, the conflict banner, instant notifications, channel authorisation |

Tests create their own records (titles prefixed with a unique token) and restore shared state
they change (theme, locale), so the suite can run repeatedly against the same database.

## Continuous integration

`.github/workflows/e2e.yml` builds the packages, seeds each playground, serves it with
`php artisan serve` and runs the suite with Playwright's Chromium, one job per renderer.

## Running beside Laravel Herd's dev tools

Herd adds an "Edit with Herd" badge to the sites it serves (the suite hides it, see
`fixtures/test.ts`) and may start a Vite dev server for a site, which swaps the built assets
for development sources under the tests. `scripts/e2e-local.sh` avoids both: it serves each
playground on a port of its own with the built assets, runs the suite and stops the servers.

```bash
scripts/e2e-local.sh                 # every spec, three renderers, all languages
scripts/e2e-local.sh docs-forms      # one spec
E2E_SSR=1 scripts/e2e-local.sh ssr   # the server-side rendering check
E2E_REALTIME=1 scripts/e2e-local.sh realtime   # real-time (starts Reverb and queue workers)
E2E_DEBUG_OFF=1 scripts/e2e-local.sh debug-off # error notifications as in production (APP_DEBUG=false)
```

`ALFAKIT_BUILT_ASSETS=1` makes the playground ignore a `public/hot` file. Two runs at the same
time need their own output folder (`--output=test-results-<name>`), or they delete each other's
traces. `E2E_LOCALES=1` adds the pass over every language (it changes the signed-in user's
language while it runs) and `E2E_SSR=1` the server-side rendering check, which needs
`pnpm run build:ssr` and `php artisan inertia:start-ssr` in each playground.
