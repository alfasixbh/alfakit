---
title: Doctor
description: Check an AlfaKit installation with one command and get the fix for every problem it finds.
---

# Doctor

```bash
php artisan alfakit:doctor
```

The doctor checks the installation and prints a table: `✓` passed, `!` warning, `✗` error, `-` not applicable. Below the table, every warning and error comes with the command or change that fixes it.

| Group        | What is checked                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Environment  | PHP 8.4+ and `ext-intl`, Laravel 13+, `inertiajs/inertia-laravel` 3+, `APP_KEY` set, debug mode off in production                                                                                                                                                                                                                                                                                                                     |
| Frontend     | `package.json` names `@alfakit/react`, `@alfakit/vue` or `@alfakit/svelte`; the package is installed (`node_modules`, else `package-lock.json` / `pnpm-lock.yaml`) and its version matches `alfasix/alfakit` (same major, and same minor while 0.x); `@alfakit/core` matches the renderer; `public/build/manifest.json` exists and has every panel's Vite entries (or `public/hot` while developing, which is an error in production) |
| SSR          | When an SSR entry (`resources/js/alfakit/ssr.*`) or bundle exists: the bundle is built (`bootstrap/ssr/ssr.js` or `inertia.ssr.bundle`) and the entry exists                                                                                                                                                                                                                                                                          |
| Panels       | At least one panel; panel providers in `app/Providers` that are not registered; per panel: a stale or broken `alfakit:optimize` discovery cache, resources (class, model), pages and widgets resolve, and resources without a policy (a warning that says what that means with and without `strictAuthorization()`; resources overriding `can()` / `canViewAny()` or skipping authorisation count as guarded)                         |
| Translations | Published overrides in `lang/vendor/alfakit/{locale}`: placeholders that differ from English (error), keys English does not have (warning), keys that fall back to English (warning)                                                                                                                                                                                                                                                  |
| Storage      | Public local disks used by uploads (the default disk and `->disk('…')` calls in your resources) are linked (`storage:link`)                                                                                                                                                                                                                                                                                                           |
| Queue        | When exports, imports or queued plugins (webhooks, workflows, backup) are used: not the `sync` driver in production                                                                                                                                                                                                                                                                                                                   |
| Broadcasting | When a panel uses `->realtime()`: a broadcasting connection other than `null` / `log`, and `laravel-echo` installed                                                                                                                                                                                                                                                                                                                   |
| Database     | The connection works; tables of the features you opted into exist: record versions (`HasRecordVersions` models), saved table views, customizable dashboards, imports and exports; user preferences (warning: they fall back to the session)                                                                                                                                                                                           |
| Cache        | In production, config, routes and events are cached; while developing, nothing is cached                                                                                                                                                                                                                                                                                                                                              |

## In CI

```bash
php artisan alfakit:doctor --json          # machine-readable report
php artisan alfakit:doctor --strict        # warnings fail the build too
```

The command exits with code 1 when a check fails (an error, or a warning with `--strict`). `--json` prints `{"passed": bool, "summary": {"ok", "warning", "error", "skipped"}, "checks": [{"group", "label", "status", "message", "fix"}]}`.

## Adding checks

Packages and applications add their own checks from a service provider. A check that throws is reported as an error instead of stopping the doctor.

```php
use AlfaSix\Alfakit\Support\Doctor\Doctor;
use AlfaSix\Alfakit\Support\Doctor\DoctorCheck;

Doctor::extend(fn (): array => [
    filled(config('services.stripe.secret'))
        ? DoctorCheck::ok('Billing', 'Stripe', 'secret key set')
        : DoctorCheck::error('Billing', 'Stripe', 'STRIPE_SECRET is missing', 'Add STRIPE_SECRET to .env.'),
]);
```

Version, environment and cache facts come from `AlfaSix\Alfakit\Support\Doctor\DoctorEnvironment`; bind a subclass in the container to fake them in tests.
