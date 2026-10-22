---
title: Setup wizard
description: One command that installs AlfaKit and sets up users, roles, AI, realtime, plugins, branding and demo data.
---

# Setup wizard

```bash
php artisan alfakit:setup
```

`alfakit:setup` asks a few questions and runs the right installers for you. It never repeats work: run it again later to add a step you skipped, and everything that is already done shows as **already set up**.

The default is a **minimal install**: every optional step defaults to _no_, no plugin is pre-selected, and each question explains in one line what it adds. Pick what you need now and add the rest later with [`alfakit:add`](#adding-and-removing-plugins) or by running the wizard again.

## What it does

1. **Detects your app**: the Inertia adapter (from `package.json`), a Laravel starter kit (`resources/js/layouts/app-layout.tsx`, `AppLayout.vue` or `AppLayout.svelte`), Laravel Fortify and `inertiajs/inertia-laravel`.
2. **Installs AlfaKit** in the mode you choose, by running `alfakit:install`:
    - `panel`: an admin panel with its own login, layout and navigation;
    - `starter-kit`: the panel inside your starter kit app, using its auth, layout and sidebar (`alfakit:install --starter-kit`), the default when a starter kit is detected;
    - `standalone`: AlfaKit components in your own Inertia pages, without a panel.
3. **Roles and permissions** (optional): installs the [Shield plugin](../plugins/shield), registers it, runs `alfakit-shield:install` and adds spatie's `HasRoles` trait to your `User` model. The summary then tells you to generate the permissions and make yourself a super admin (`php artisan alfakit-shield:generate --panel=admin && php artisan alfakit-shield:super-admin --panel=admin`).
4. **Users resource**: runs [`alfakit:users`](../resources/users), with a roles field when you chose roles.
5. **AI providers** (optional): runs [`alfakit:ai-setup`](#ai-providers).
6. **Realtime** (optional): runs [`alfakit:realtime`](#realtime).
7. **First-party plugins** (optional): asks "Add first-party plugins now?" (default no; AlfaKit works without any). Answer yes to pick from the list (Space to tick, Enter to confirm); it installs them with Composer, registers them on the panel provider and publishes their migrations. Add more later with `php artisan alfakit:add`.
8. **Branding**: writes the primary colour, logo and font to the panel provider (`->colors()`, `->brandLogo()`, `->font()`).
9. **Demo data** (optional): writes `database/seeders/AlfakitDemoSeeder.php` (an admin and a dozen users) and seeds it. It never seeds in production.
10. **Migrations**: asks once at the end when a step added migrations.
11. **Admin user** (panel mode): offers to create the user you sign in with (`make:alfakit-user`), or creates it from `--admin-email`, `--admin-name` and `--admin-password`. In starter-kit mode you sign in with the app's own login.
12. **Summary**: every step with its result, then the next steps (plugin notes, commands to run).

## Flags

Every question has a flag. Without `--no-interaction` the wizard only asks what the flags didn't answer; with it, a step whose flag is missing is skipped.

| Flag                                    | Answers                                                                                                        |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `--adapter=react\|vue\|svelte`          | The renderer (default: detected from `package.json`)                                                           |
| `--panel=admin`                         | The panel id                                                                                                   |
| `--mode=panel\|starter-kit\|standalone` | How AlfaKit is installed (default: `starter-kit` when one is detected)                                         |
| `--users`                               | Generate the users resource                                                                                    |
| `--roles`                               | Roles and permissions with Shield                                                                              |
| `--ai=openai,anthropic`                 | The `laravel/ai` providers to configure                                                                        |
| `--realtime`                            | Reverb and live notifications                                                                                  |
| `--plugins=activity-log,comments`       | First-party plugins (slugs below), or `all`                                                                    |
| `--bundle=saas,ops`                     | [Plugin bundles](bundles): `saas`, `content`, `backoffice`, `support`, `ops` or `all`                          |
| `--brand-color="#2563eb"`               | The primary colour: a hex colour or any CSS colour function (`oklch(…)`)                                       |
| `--logo=images/logo.svg`                | A path under `public/` (written as `asset(…)`; put the file there, or the panel shows a broken image) or a URL |
| `--font=Inter`                          | The font family                                                                                                |
| `--demo`                                | Write and run the demo seeder                                                                                  |
| `--admin-email=you@example.com`         | Create the admin user you sign in with (needs `--admin-password`)                                              |
| `--admin-name=Admin`                    | The admin user's name (default `Admin`)                                                                        |
| `--admin-password=…`                    | The admin user's password                                                                                      |
| `--migrate`                             | Run the migrations without asking                                                                              |
| `--no-install`                          | Never run Composer or npm: the summary lists the commands to run yourself                                      |
| `--force`                               | Overwrite generated files                                                                                      |

A complete unattended run:

```bash
php artisan alfakit:setup --mode=panel --users --roles \
    --plugins=activity-log,comments,media-library \
    --brand-color="#2563eb" --logo=images/logo.svg --font=Inter \
    --demo --migrate --admin-email=you@example.com --admin-password=secret \
    --no-interaction
```

Plugin slugs: `activity-log`, `ai`, `analytics`, `api`, `backup`, `billing`, `calendar`, `cms`, `comments`, `feature-flags`, `file-manager`, `forms`, `health`, `helpdesk`, `invoices`, `kanban`, `mail-templates`, `media-library`, `ops`, `settings`, `shield`, `tags`, `teams`, `translation-manager`, `tree`, `webhooks`, `workflows` (`php artisan alfakit:add --list` shows the current list with descriptions). Each is installed as `alfasix/alfakit-<slug>`. Plugins that need a spatie package (activity log, media library, tags, settings) get its migrations published; the summary lists what is left, such as adding `LogsActivity` to a model.

## Adding and removing plugins

```bash
php artisan alfakit:add --list                 # every first-party plugin, what it does, installed / on the panel
php artisan alfakit:add --list kanban          # its highlights, a tour of the live demo and the plugins it works well with
php artisan alfakit:add comments activity-log  # composer require (asks first), register on the panel, publish migrations
php artisan alfakit:remove comments            # unregister from the panel, composer remove (asks first)
```

`alfakit:add` runs the same plugin step as the wizard: `composer require alfasix/alfakit-<slug>` after a confirmation, an entry `CommentsPlugin::make(),` in the panel provider's `->plugins([...])` array (added at the end of the chain when there is none; later plugins are appended, so they register in the order you added them) with its import, kept sorted, the plugin's migration publishing, then asks to migrate (`--migrate` runs them without asking). Without arguments it asks which plugins to add. Adding a plugin that is already set up changes nothing.

`alfakit:remove` unregisters the plugin (a `->plugin(...)` call with its chained configuration, or its entry in `->plugins([...])`, and the unused import), then `composer remove`s the package after a confirmation, unless another panel provider still registers it. **Database tables are never dropped**: the command reminds you to write a migration if you no longer need the data. Removing `shield` also takes spatie's `HasRoles` trait (added by `--roles`) off your user model once spatie/laravel-permission is gone, and points you at the roles field of the generated users resource.

| Flag            | Description                                         |
| --------------- | --------------------------------------------------- |
| `--panel=admin` | The panel provider to register on / unregister from |
| `--no-install`  | Don't run Composer; print the command instead       |
| `--migrate`     | (`alfakit:add`) run the migrations without asking   |
| `--list`        | (`alfakit:add`) list the plugins and their status   |

The catalogue is read from the plugins' own `composer.json` files at runtime (descriptions, plugin class, migration tag), so new first-party plugins show up without updating AlfaKit.

## AI providers

```bash
php artisan alfakit:ai-setup
```

Sets up [`laravel/ai`](https://github.com/laravel/ai) (it offers to install it when it is missing):

- lists the providers from `config/ai.php` (OpenAI, Anthropic, Gemini, Mistral, Groq, xAI, DeepSeek, OpenRouter, Ollama, Azure, Bedrock, Cohere, Jina, VoyageAI, ElevenLabs…) and asks which you use;
- asks for each API key with a **hidden prompt** and writes it to `.env` (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`…), and the same key with an empty value to `.env.example`. Providers without a default URL (Azure, OpenAI-compatible) also get their URL. A key already in `.env` is kept unless you replace it;
- publishes `config/ai.php` when it isn't there yet, and sets the default provider (`'default'`) and, optionally, its default text model (`models.text.default`);
- sends a tiny request to each provider's cheapest text model and reports which keys work. Keys are never printed, and anything key-like in an error message is masked.

| Flag                      | Description                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `--providers=openai,groq` | The providers to configure, without the question                                                                    |
| `--default=openai`        | The default provider                                                                                                |
| `--model=`                | The default provider's default text model                                                                           |
| `--check`                 | Only report which providers have a key, and test them; never installs anything (exits 1 when laravel/ai is missing) |
| `--no-test`               | Don't send the test request                                                                                         |
| `--no-install`            | Don't install `laravel/ai` when it is missing                                                                       |

Without interaction, keys come from the environment of the command, so they stay out of your shell history and CI logs:

```bash
OPENAI_API_KEY="$OPENAI_API_KEY" php artisan alfakit:ai-setup --providers=openai --default=openai --no-interaction
php artisan alfakit:ai-setup --check
```

Providers without text generation (embeddings, reranking, audio) are configured but reported as "not tested". `--check` exits with code 1 when a key fails, so it can guard a deployment.

## Realtime

```bash
php artisan alfakit:realtime
```

Live notifications over [Laravel Reverb](https://reverb.laravel.com):

- installs `laravel/reverb` with Composer (asks first);
- runs Laravel's `install:broadcasting --reverb` (the `routes/channels.php` file, `config/broadcasting.php`, the channels route in `bootstrap/app.php`) and `reverb:install` (`config/reverb.php`);
- writes `BROADCAST_CONNECTION=reverb`, the `REVERB_*` keys and the `VITE_REVERB_*` keys Echo reads to `.env`, and empty ones to `.env.example`;
- creates `resources/js/alfakit/echo.ts`, which sets up Laravel Echo as `window.Echo` in the browser only. The panel entry (`resources/js/alfakit/app.tsx` or `app.ts`) loads it when AlfaKit first needs Echo, with `createAlfakit({ echo: () => import('./echo').then((module) => module.default()) })`, so `laravel-echo` and `pusher-js` stay out of the entry's chunk (a static import there, with a second entry such as the CMS public site's `site.ts`, could leave every page blank). In starter-kit mode `resources/js/app.*` imports it. Running the command again (with `--force` for an `echo.ts` written by an earlier version) moves an existing `import './echo'` in the panel entry to that factory;
- installs `laravel-echo` and `pusher-js` from npm (asks first), plus `@laravel/echo-react` or `@laravel/echo-vue` when `install:broadcasting` configured Echo in your app's own entry;
- turns on `->realtimeNotifications()` on the panel (see [Realtime notifications](../notifications/overview#realtime-notifications)), and `->realtime()` when your AlfaKit version has it.

`--no-install` skips Composer and npm and prints the commands; `--force` rewrites `echo.ts`. Then start the WebSocket server and a queue worker:

```bash
php artisan reverb:start
php artisan queue:work
```

Never import `echo.ts` in the SSR entry.
