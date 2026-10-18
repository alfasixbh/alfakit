# Contributing to AlfaKit

Thank you for considering a contribution. This guide explains how the monorepo is organised and how to get a change merged.

## Repository layout

```
alfakit/
├── packages/
│   ├── alfakit/      PHP package  → Packagist alfasix/alfakit
│   ├── core/         @alfakit/core    framework-agnostic schema types + state
│   ├── react/        @alfakit/react   shadcn/ui renderer
│   ├── vue/          @alfakit/vue     shadcn-vue renderer
│   └── svelte/       @alfakit/svelte  shadcn-svelte renderer
├── playground/
│   ├── react/        Laravel app using the React starter kit + Alfakit
│   ├── vue/          Laravel app using the Vue starter kit + Alfakit
│   └── svelte/       Laravel app using the Svelte starter kit + Alfakit
└── docs/             Documentation site (Laravel + Inertia, dogfoods Alfakit)
```

## Prerequisites

- PHP 8.3+, Composer 2
- Node 22+, pnpm 10+
- SQLite (playgrounds default to it)

## Setup

```bash
composer install
pnpm install
pnpm build
```

Each playground is a normal Laravel app. From `playground/react`:

```bash
cp .env.example .env && php artisan key:generate
php artisan migrate --seed
pnpm dev
```

With [Laravel Herd](https://herd.laravel.com) the playgrounds are served at `http://alfakit-react.localhost`, `http://alfakit-vue.localhost` and `http://alfakit-svelte.localhost` after linking (`herd link alfakit-react` inside each directory).

## Development workflow

| Task                     | Command                                                      |
| ------------------------ | ------------------------------------------------------------ |
| PHP tests                | `composer test`                                              |
| PHP formatting           | `composer format`                                            |
| PHP static analysis      | `composer analyse`                                           |
| JS tests                 | `pnpm test`                                                  |
| JS lint + format check   | `pnpm lint`                                                  |
| JS typecheck             | `pnpm typecheck`                                             |
| Watch-build all packages | `pnpm dev`                                                   |
| Bundle size budget       | `pnpm run perf:budget`                                       |
| Everything CI runs       | `composer check && pnpm lint && pnpm typecheck && pnpm test` |

## Performance budgets

Three guards keep large panels fast; run the ones your change touches.

- **Bundle size** — `pnpm run perf:budget` builds the React playground and measures the gzip size of the panel entry's initial JavaScript (`resources/js/alfakit/app.tsx` plus the chunks it imports statically; lazy `import()` chunks don't count). It fails when the total is over `limitGzipBytes` in `scripts/perf-budget.json`. If a change legitimately needs more (a new built-in field, say), run `pnpm run perf:budget:update` to store the measured size as the baseline with 10% headroom, and say why in the PR. Prefer lazy-loading heavy dependencies (see `lazy.ts` in `@alfakit/core`) over raising the limit.
- **Large forms and tables** — `pnpm test` includes a `large-form` suite in every renderer: a Repeater with 500 items (TextInput, Select, FileUpload) and a 1,000-row, 12-column table must render under a time budget with a bounded DOM node count, which they do because long lists are virtualised (`docs/content/advanced/performance.md`). `composer test` includes `LargePayloadBudgetTest`, which bounds the JSON size and PHP time of the same payloads.
- **Measured numbers only** — when you touch a budget, put the numbers you measured (and how) in the test's comment; never guess a budget.

## Coding standards

- **PHP** follows the Laravel preset enforced by Pint, with `declare(strict_types=1)` everywhere. PHPStan runs at level 6. Public API is fluent and immutable-by-convention: configuration methods return `static`, and any value may be a `Closure` that is resolved through `evaluate()` with dependency injection.
- **TypeScript** is strict. Framework-agnostic logic belongs in `@alfakit/core`; renderer packages only translate schema into components. Never duplicate validation, authorisation or query logic in JavaScript — the PHP side is the single source of truth.
- **Schema contract**: anything the PHP side emits must be described by a type in `packages/core/src/schema`. When you add a PHP component, add its TypeScript type and a renderer in each adapter (or mark it as unsupported explicitly).
- **Tests**: every PHP feature needs a Pest test; every JS state module needs a Vitest test; renderer components get at least a smoke test.

## Commits and pull requests

- Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat(forms): add ColorPicker field`).
- One concern per PR. Include a changeset (`pnpm changeset`) when you touch an npm package, and a `CHANGELOG.md` entry under _Unreleased_ when you touch the PHP package.
- Fill in the PR template. CI must be green.
- Documentation lives in `docs/content`. A feature is not done until it is documented for all three adapters.

## Reporting bugs

Open an issue using the bug template. A failing Pest test or a minimal reproduction repository gets fixed fastest.

## Licence

By contributing you agree that your contributions are licensed under the MIT licence.
