# Fresh-install acceptance harness

`e2e/` tests the pre-built playgrounds. This harness tests what a **new user** gets: it creates
a brand-new app from Laravel's React, Vue or Svelte starter kit, installs AlfaKit from this
monorepo by following the docs, runs the generators, and drives Chromium through the journeys
a new user goes through. Every bug found by hand after a release so far is a check here.

```bash
pnpm install                                  # once: Playwright comes from e2e/
node scripts/acceptance/run.mjs --renderer=react --mode=starter-kit
node scripts/acceptance/run.mjs --renderer=all --mode=all          # 6 apps, ~1 h
node scripts/acceptance/run.mjs --renderer=vue --mode=panel --keep # keep the app to look at it
node scripts/acceptance/run.mjs --reuse=alfakit-acc-vue-panel-ab12c --renderer=vue --mode=panel
                                              # re-run only the browser part on a kept app
node scripts/acceptance/run.mjs --serve ...   # php artisan serve instead of Herd (CI, Linux)
```

| Option           | Default                                         | What it does                                                                    |
| ---------------- | ----------------------------------------------- | ------------------------------------------------------------------------------- |
| `--renderer=`    | `all`                                           | `react`, `vue`, `svelte`, a comma list or `all`                                 |
| `--mode=`        | `all`                                           | `starter-kit`, `panel`, a comma list or `all`                                   |
| `--keep`         | off                                             | Keep the app (and its Herd link); it is deleted otherwise                       |
| `--serve`        | on outside macOS                                | Serve with `php artisan serve` on a free port (`http://127.0.0.1:<port>`)       |
| `--apps-dir=`    | `~/Herd` (Herd) or `$TMPDIR/alfakit-acceptance` | Where the app is created                                                        |
| `--tarballs=`    | a new temp dir                                  | Where the npm tarballs are packed                                               |
| `--reuse=<name>` |                                                 | Skip the install, re-run the browser journeys against an app kept with `--keep` |

Requirements: PHP 8.3+ with intl and sqlite, Composer, the Laravel installer (`laravel new`),
Node 22 with npm and pnpm, and Herd on macOS (the site is `http://<app>.localhost`) unless you
pass `--serve`. Chromium is Playwright's bundled one (`pnpm --filter @alfakit/e2e exec
playwright install chromium`); `ACC_BROWSER_CHANNEL=chrome` uses the installed Chrome and
`ACC_HEADED=1` shows the browser.

## What it does

Per renderer × mode, an app named `alfakit-acc-<renderer>-<mode>-<id>`:

1. **Install** — `laravel new <name> --<renderer> --database=sqlite --pest --npm --no-boost
--no-interaction` (`--no-boost` keeps the installer from asking about Boost), `herd link`
   (no name argument) or `php artisan serve`, `.env`: `APP_URL`, `INERTIA_SSR_ENABLED=false`,
   `QUEUE_CONNECTION=sync`, `MAIL_MAILER=log`.
2. **PHP package** from Composer path repositories pointing at `packages/alfakit` and
   `packages/translations` (`symlink: false`, so the app is a snapshot; the version is the last
   git tag), with `minimum-stability: dev` and `prefer-stable`: `composer require
"alfasix/alfakit:@dev"`. Checked: Composer installed it from the path repository.
3. **npm renderer** from local tarballs: `pnpm --filter @alfakit/core build`, the renderer's
   build, `pnpm pack` each, then `npm install <core.tgz> <renderer.tgz>` in the app **before**
   the setup wizard, so its npm step keeps the local version. Checked after setup:
   `package-lock.json` resolves both to `file:` and the installed `dist/index.js` is the
   monorepo build.
4. **The documented commands**, word for word (generators also get `--no-interaction`):
   `php artisan alfakit:setup --mode=<mode> --users --migrate --no-interaction` (panel mode adds
   `--admin-email` / `--admin-password`), `composer require alfasix/alfakit-translations` and
   `->locales(['en', 'ar'])`, the models and migrations, `make:alfakit-resource Post --generate
--view`, `Comment --generate --view --nested=PostResource`, `Reply --generate --view
--nested=CommentResource`, `make:alfakit-widget BlogStats --type=stats` with the
   `StatsOverviewWidget` example of `docs/content/widgets/overview.md` copied verbatim, a seeder,
   and `php artisan alfakit:doctor`.
5. **Browser journeys** (Playwright, Chromium) — see the step list below.
6. **Route crawl** — every GET route under `admin/` from `php artisan route:list --json`, with
   `{record}` / `{post}` / `{comment}` filled from the seeded records, requested signed in
   (logout and impersonation excluded). Any 5xx fails; 4xx are listed.
7. **Logs** — any `local.ERROR` in `storage/logs/laravel.log` fails (after the commands, and
   after the browser part).
8. **Cleanup** — `herd unlink`, the Herd `Sites/<name>` symlink and the app directory are removed
   unless `--keep`. Only directories named `alfakit-acc-*` are ever deleted.

The models (`fixtures/`) are posts → comments → replies with `text` bodies and `$fillable`.
`Post` and `Reply` declare typed relationships; **`Comment` declares `post()` and `replies()`
without return types**, as many users write them, so the nested generator has to find untyped
relationships. `Note` has no `SoftDeletes` and gets `--soft-deletes`.

Every browser step fails on any console error, page error, failed request or 5xx response
that happens while it runs, and takes a full-page screenshot.

## The checks, and the bug each one guards

| Step    | Check                                                                                                                                                                                       | Guards                                                                        |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| G01     | The docs still contain every command the harness runs                                                                                                                                       | harness and docs drifting apart                                               |
| G02     | Complete PHP examples in the followed docs import every class they use                                                                                                                      | docs examples without imports                                                 |
| A05     | `alfakit:setup` exits 0, its summary has no failed step                                                                                                                                     |                                                                               |
| A05a    | Panel mode: `--admin-email` / `--admin-password` created the admin user (recovery: `make:alfakit-user`)                                                                                     |                                                                               |
| A06     | `public/build/manifest.json` has the AlfaKit entry right after setup                                                                                                                        | Vite manifest not built after setup                                           |
| A07     | The app runs the local tarballs                                                                                                                                                             | (harness integrity)                                                           |
| A08     | The `notifications` table exists when the panel uses database notifications                                                                                                                 | missing notifications table                                                   |
| A12/A13 | Nested generator: `$parentResource`, no parent key in the form, a relation manager on the parent with `$relatedResource`, registered in `getRelations()`                                    | nested resources unreachable                                                  |
| A14     | `--soft-deletes` on a model without `SoftDeletes` warns and writes no trashed code                                                                                                          | `--soft-deletes` on a non-SoftDeletes model                                   |
| A15     | The docs' widget example loads                                                                                                                                                              | docs examples without imports                                                 |
| A18     | `alfakit:doctor` exits 0                                                                                                                                                                    |                                                                               |
| B01     | Sign in: `/admin/login` (panel) or `/register` + email verified (starter kit)                                                                                                               |                                                                               |
| B02     | The sidebar lists Posts and Users, not the nested resources                                                                                                                                 |                                                                               |
| B03     | `/admin` answers < 500 and never lands on a nested resource                                                                                                                                 | `/admin` crashing on a nested resource                                        |
| B04–B07 | Posts: list, create, edit, delete                                                                                                                                                           |                                                                               |
| B08/B09 | Post **view** and **edit** pages list the comments by their text, with "New comment"                                                                                                        | relation managers read-only on View pages / showing the ID                    |
| B10     | Clicking a comment row opens the comment                                                                                                                                                    | rows not clickable                                                            |
| B11     | "New comment" opens `/posts/{post}/comments/create`; no Post picker; breadcrumbs `Posts › post › Comments`                                                                                  | nested create unreachable                                                     |
| B12–B14 | Create (under the right post), edit, delete a comment                                                                                                                                       |                                                                               |
| B15–B20 | The same for replies from the comment's view page, breadcrumbs include the whole chain                                                                                                      |                                                                               |
| B21     | The `--soft-deletes` Notes resource works                                                                                                                                                   | `--soft-deletes` on a non-SoftDeletes model                                   |
| B22     | Panel dashboard shows BlogStats                                                                                                                                                             |                                                                               |
| B23     | Starter kit `/dashboard` shows BlogStats (labels and values) inside `[data-slot="starter-kit-widgets"]`                                                                                     | widgets not shown on the starter kit dashboard                                |
| B24–B26 | Users resource: list, view, the "Invite user" modal                                                                                                                                         |                                                                               |
| B27     | ⌘K / Ctrl+K opens the command palette                                                                                                                                                       |                                                                               |
| B28     | Switching to Arabic renders right to left (`html[dir]` in panel mode, AlfaKit's content root in starter kit mode)                                                                           |                                                                               |
| B28     | ...the layout doesn't break: no overlap, nothing scrolls sideways; panel: the sidebar is right of the content; starter kit: `<html dir>` stays the app's                                    |                                                                               |
| B29     | Starter kit: after an AlfaKit page in Arabic, Inertia navigation to the app's own `/dashboard` does not keep `<html dir="rtl" lang="ar">`                                                   |                                                                               |
| B30     | Posts table: selecting two rows, the bulk "Delete" opens its "Delete selected records" confirmation; Cancel keeps every post                                                                | bulk action modals not opening (404/500)                                      |
| B31     | The built stylesheet contains classes defined in `@alfakit/core` (`max-md:flex-col` of `stackedOnMobile()`, `sm:w-lg` of `filtersFormWidth()`)                                              | renderer CSS not scanning core                                                |
| B32     | Starter kit: the header's `<AlfakitLanguageSwitcher />` shows on `/dashboard` and, on `/admin/posts`, picking Arabic mirrors AlfaKit's content (not `<html dir>`) and English switches back | no language switcher in starter kit apps (header and user menu are the app's) |
| B33     | Browser Back from the new post (B05) to the posts list shows the new post without a refresh                                                                                                 | stale list after Back (Inertia restores the saved page)                       |
| C01     | Route crawl: no GET route under `/admin` answers 5xx (responses Node cannot parse are re-requested in the browser)                                                                          | any page crashing                                                             |
| C02     | Response headers stay under 8 KB (the kit's `AddLinkHeadersForPreloadedAssets` adds a `Link` entry per preloaded chunk; AlfaKit caps it), listed from 4 KB                                  | 502s behind nginx with default buffers                                        |
| A19/L01 | No `local.ERROR` in `laravel.log`                                                                                                                                                           | errors swallowed by the UI                                                    |

Steps depend on each other only where they must: when the install fails the rest is skipped
(`blocked: …`); when a check of the setup fails (A06–A08) the harness records the failure,
applies the obvious fix (build, reinstall, migrate) and continues, so one bug never hides the
others.

## Reports

`scripts/acceptance/reports/<timestamp>-<renderer>-<mode>.md` (gitignored) lists PASS / FAIL /
SKIP per step with the error, and the folder next to it holds the screenshots, the setup and
doctor output, the crawl results and any `laravel.log` errors. `<timestamp>-run.log` has every
command and its full output.

## CI

`.github/workflows/acceptance.yml` runs the matrix (renderer × mode) on Ubuntu with PHP 8.4,
Node 22 and the Laravel installer in `--serve` mode, on demand (`workflow_dispatch`, with
renderer / mode inputs), nightly and for `v*` tags, and uploads the reports as artifacts.
