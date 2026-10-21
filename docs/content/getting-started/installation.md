---
title: Installation
description: Install the PHP package and the renderer for your framework.
---

# Installation

## Requirements

- PHP 8.4 or newer, Laravel 13
- Node 22+, a package manager (npm, pnpm, bun or yarn)
- An Inertia application using Tailwind CSS 4 — the official **React**, **Vue** or **Svelte** starter kits are the supported baseline (`laravel new my-app --react`)

## Choose how to use AlfaKit

AlfaKit runs in one of three modes. The [setup wizard](setup-wizard) asks which one you want and picks starter kit mode by default when it finds a starter kit.

| Mode                        | What you get                                                                                              | Sign in                                                                           | Pick it when                                                                                                                         |
| --------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Admin panel**             | A separate panel at `/admin` with its own login, layout, navigation and theme                             | AlfaKit's own login page; create your user with `make:alfakit-user`               | You want a classic back office next to your app (like Filament)                                                                      |
| **Inside your starter kit** | AlfaKit pages inside your app's own layout: listed in its sidebar, using its theme and light/dark setting | Your app's own login and registration (Fortify), including its email verification | Your app is made from Laravel's React, Vue or Svelte starter kit and admins already use it. See [Inside a starter kit](starter-kits) |
| **Standalone**              | AlfaKit forms, tables, actions and widgets in your own Inertia pages, without a panel                     | Your app's own auth                                                               | You only want AlfaKit components in pages you build yourself. See [Outside panels](../standalone/overview)                           |

You can add a separate admin panel to a starter kit app too: choose **Admin panel** in the wizard (`--mode=panel`). Both can live in one app.

## 1. Install the Composer package

```bash
composer require alfasix/alfakit
```

### Versions during the beta

AlfaKit is in public beta (0.1), and APIs may still change before 1.0. Composer's default caret constraint for a 0.x release, `^0.1`, already accepts only 0.1.x patch releases, so a new minor version (0.2) is never installed without you changing the constraint. The npm renderer's default, `^0.1.0`, behaves the same way. Keep both constraints on the same minor version and read the [changelog](/changelog) before you move to the next minor version.

## 2. Run the setup wizard (recommended)

```bash
php artisan alfakit:setup
```

The wizard looks at your app (Inertia adapter, a Laravel starter kit, Fortify) and walks you through everything in one go:

- installs AlfaKit as an **admin panel**, **inside your starter kit**, or as **standalone** components (it runs `alfakit:install` with the right options);
- generates a complete **users resource** with invitations, impersonation, suspend/ban, forced password changes, 2FA reset and sessions ([`alfakit:users`](../resources/users));
- adds **roles and permissions** with the Shield plugin;
- configures **AI providers** for `laravel/ai` ([`alfakit:ai-setup`](setup-wizard#ai-providers)) and **realtime** notifications over Reverb ([`alfakit:realtime`](setup-wizard#realtime));
- installs the **first-party plugins** you pick, sets your **brand colour, logo and font**, and can seed **demo data**;
- creates the **admin user** you sign in with (it asks for a name, email address and password);
- ends with a summary and the next steps.

Every question has a flag, so CI and scripts can run it unattended, and running it again skips what is already done:

```bash
php artisan alfakit:setup --mode=panel --users --roles --plugins=activity-log,comments \
    --brand-color="#2563eb" --font=Inter --demo --migrate --no-interaction
```

See [Setup wizard](setup-wizard) for every step and flag. Prefer to do it step by step? Run the installer yourself:

## 3. Or run the installer yourself

```bash
php artisan alfakit:install
```

The installer:

- publishes `config/alfakit.php`;
- creates `app/Providers/Alfakit/AdminPanelProvider.php` and registers it in `bootstrap/providers.php`;
- creates the migration for Laravel's `notifications` table (the generated panel turns on database notifications), unless the app already has one; run `php artisan migrate` afterwards;
- creates a **dedicated Vite entry** for the panel — `resources/js/alfakit/app.tsx` (React) or `app.ts` (Vue, Svelte) — and `resources/css/alfakit.css`, and adds both to `laravel-vite-plugin`'s `input`;
- installs the npm renderer (`@alfakit/react`, `@alfakit/vue` or `@alfakit/svelte`), detected from your `package.json`; pass `--adapter=vue` to force one, or `--no-npm` to skip;
- with `--ssr`, also sets up [server-side rendering](../advanced/ssr): `resources/js/alfakit/ssr.*`, the Vite SSR entry and a `build:ssr` script.

The panel has its own entry so it never collides with your application's own Inertia pages, layouts or global styles.

## 4. Create your admin user

The panel has its own login page, so you need a user to sign in with. The setup wizard offers to create one; otherwise (or for more users) run:

```bash
php artisan make:alfakit-user
```

It asks for a name, email address and password and creates the user with your app's `User` model, already verified. Pass `--name`, `--email` and `--password` to skip the questions. Once you are in, the [users resource](../resources/users) lets you invite and manage everyone else from the panel. In a [starter kit](starter-kits) install, sign in with your app's own login and registration pages instead.

## 5. Create a resource

```bash
php artisan make:alfakit-resource Post --generate
```

The resource saves its form with Eloquent's `create()` and `update()`, so the model must allow mass assignment of the fields: list them in `protected $fillable = [...]` (or use `protected $guarded = [];`). `--generate` warns when the model would refuse a field.

`--generate` inspects the `posts` table and creates sensible form fields and table columns. Add `--view` for a view page, `--soft-deletes` for the trashed filter and restore actions (the model must use `SoftDeletes`), or `--simple` for modal-based CRUD on a single page.

## 6. Build and visit

```bash
npm run dev     # or npm run build
```

Open `/admin` and sign in with the user from step 4. The panel has its own Vite entries, so a build made before you installed AlfaKit (starter kits ship one in `public/build`) does not include them: until you rebuild or start the dev server, the panel fails with "Unable to locate file in Vite manifest". `php artisan alfakit:doctor` checks this.

## Inside a Laravel starter kit

In an app made from Laravel's React, Vue or Svelte starter kit, run the installer with `--starter-kit` instead:

```bash
php artisan alfakit:install --starter-kit
```

The panel then uses the app's own login (Fortify), renders inside its `AppLayout`, lists its resources in the app sidebar and follows the app's theme and appearance. See [Inside a starter kit](starter-kits).

## Using AlfaKit outside panels

Forms, tables, infolists, actions and widgets also work in your application's own Inertia pages, without a panel. In an app that has no panel yet, run the installer with `--standalone`:

```bash
php artisan alfakit:install --standalone
```

It imports `@alfakit/<adapter>/standalone.css` into `resources/css/app.css`, installs the npm renderer, and creates an example `app/Alfakit/Standalone/ContactForm.php` with a `contact` page. In an app that already has a panel, only the stylesheet import is needed. See [Outside panels](../standalone/overview).

## More languages (optional)

```bash
composer require alfasix/alfakit-translations
```

Then list the languages on your panel: `->locales(['en', 'ar', 'fr'])`. See [Localization](../localization/overview).

## Database notifications

The generated panel calls `->databaseNotifications()`, and `alfakit:install` creates the `notifications` table migration for it. If you set up a panel by hand, create the table yourself:

```bash
php artisan make:notifications-table
php artisan migrate
```

## Updating

AlfaKit follows semantic versioning. Keep the PHP package and the npm renderer on the **same minor version**:

```bash
composer update alfasix/alfakit
npm update @alfakit/react
```

The schema contract between PHP and JavaScript is versioned with the packages, so a mismatched pair can render incomplete UI.
