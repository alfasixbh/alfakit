# AlfaKit documentation site

A Laravel 13 + Inertia (React) application that renders the markdown in [`content/`](content) and dogfoods Alfakit: the `/admin` panel is an AlfaKit panel with a `Feedback` resource and a stats widget fed by the "Was this page helpful?" form on every docs page.

## Running locally

```bash
composer install
pnpm install            # from the monorepo root
cp .env.example .env && php artisan key:generate
touch database/database.sqlite && php artisan migrate
php artisan make:alfakit-user   # creates the first panel user
pnpm exec vp build      # or `composer run dev` for Vite + queue + logs
```

With Laravel Herd the site is served at `http://alfakit-docs.localhost`. The panel lives at `/admin`.

## Writing docs

- Pages are markdown files under `content/<section>/<page>.md` with YAML front matter (`title`, `description`).
- The sidebar order comes from [`content/_sidebar.json`](content/_sidebar.json).
- GitHub-flavoured markdown is supported (tables, task lists, fenced code with language hints). Headings get permalinks and feed the on-page table of contents.
- Search (`/docs/search?q=`) indexes titles and body text at request time; no build step is needed after editing content.

## Structure

| Path                                           | Purpose                                                           |
| ---------------------------------------------- | ----------------------------------------------------------------- |
| `app/Support/Documentation.php`                | Markdown loading, rendering, TOC, search and prev/next resolution |
| `app/Http/Controllers/DocsController.php`      | `/docs`, `/docs/{slug}` and the search endpoint                   |
| `app/Http/Controllers/FeedbackController.php`  | Stores page feedback                                              |
| `app/Alfakit/Resources/FeedbackResource.php`   | Panel resource for reviewing feedback                             |
| `app/Alfakit/Widgets/FeedbackStats.php`        | Dashboard stats widget                                            |
| `app/Providers/Alfakit/AdminPanelProvider.php` | Panel definition                                                  |
| `resources/js/pages/docs/show.tsx`             | Docs page renderer (prose, TOC, feedback form)                    |
| `resources/js/components/docs/docs-layout.tsx` | Docs sidebar and mobile drawer around the site header and footer  |

## Website

The public site (home, features, demo, plugins, blog, changelog, community, services) shares its header and footer with the docs.

| Path                                      | Purpose                                                                                                          |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `app/Http/Controllers/Site/`              | Page, blog (index, post, `/blog/rss.xml`), plugins and SEO (`/sitemap.xml`, `/robots.txt`) controllers           |
| `app/Support/Site/`                       | `Blog`, `Plugins`, `Seo` (per-page head tags), `Markdown`, `Repository`, `ErrorPage`                             |
| `resources/js/pages/site/`, `welcome.tsx` | Inertia pages                                                                                                    |
| `resources/js/components/site/`           | `SiteLayout`, `SiteHeader`, `SiteFooter`, `Seo`, `Screenshot`, `FinalCta`, section helpers                       |
| `content/blog/*.md`                       | Posts; front matter `title`, `description`, `date` (quoted `"Y-m-d"`), `author`, optional `cover` and `coverAlt` |
| `content/plugins.json`                    | The plugin directory; checked by `tests/Feature/Site/PluginsTest.php`                                            |
| `public/screenshots/*.webp`               | Screenshots of the demo, light and dark                                                                          |

Every page passes a `seo` prop (`App\Support\Site\Seo::make()`); `resources/views/app.blade.php` renders it for the first response and `components/site/seo.tsx` on client visits. The changelog and security policy are read from the monorepo root (`ALFAKIT_REPOSITORY_PATH` overrides it).

### Re-taking the screenshots

`e2e/showcase/screenshots.mjs` (`pnpm showcase:screenshots`) signs in to the demo (and, for the debug panel, the React playground) with Playwright and the installed Google Chrome, and writes `public/screenshots/{name}-{light|dark}.webp` at 1440x900 (phones at 390x844), encoded by Chrome at WebP quality 0.8. It only changes session flags of its own browser session.

```bash
pnpm --filter @alfakit/e2e install       # Playwright, once
pnpm showcase:screenshots              # from the repo root: everything (about 2 minutes)
pnpm showcase:screenshots rtl debug    # only names starting with these
```

`DEMO_URL`, `PLAYGROUND_URL`, `DEMO_EMAIL`/`DEMO_PASSWORD`, `PLAYGROUND_EMAIL`/`PLAYGROUND_PASSWORD`, `BROWSER_CHANNEL` and `WEBP_QUALITY` override the defaults (Herd URLs, the demo's shared login, the playground's seeded admin). The demo data is random, so numbers and names in the images change between runs; `php artisan test` fails if a page references a screenshot that does not exist.

### Live examples

A fenced block in any page renders an example class next to its result, with React, Vue and Svelte tabs:

````md
```alfakit-example name="text-input-basic"

```
````

The name is the kebab-case file name of a standalone component in `app/Examples` (`TextInputBasic.php`): the file is the code shown and the code that runs. Each renderer is an iframe at `/docs/examples/{name}/{react|vue|svelte}` (root view `resources/views/examples.blade.php`, entries `resources/js/examples/*`); Vue and Svelte resolve from the workspace renderers (`vite.config.ts`). The Markdown for agents (`/docs/{slug}.md`, `llms-full.txt`) gets the PHP instead. `tests/Feature/LiveExamplesTest.php` checks that every example renders and is used.

### Plugin pages and clips

`/plugins/{slug}` reads each first-party plugin's `extra.alfakit.showcase` (packages/plugins/{slug}/composer.json) and the clips in `public/showcase/{slug}`. Re-record them from the demo with `pnpm showcase:record` (`--plugins=kanban --renderers=react --themes=dark`); "Try it live" links use `ALFAKIT_DEMO_URL` and `ALFAKIT_DEMO_TENANT`.

### AlfaKit plugins on this site

`config/docs.php` `dogfood` turns on the Forms contact page, Analytics (and its public dashboard link) and the Helpdesk chat bubble. All are off by default; turn one on in `.env`, then run `php artisan migrate` and `php artisan docs:dogfood`, and manage them at `/admin`.
