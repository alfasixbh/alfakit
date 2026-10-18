# Deploying the AlfaKit demo

<p><picture><source media="(prefers-color-scheme: dark)" srcset="public/brand/alfasix/alfa-six-micro-white.svg"><img src="public/brand/alfasix/alfa-six-micro-navy.svg" alt="" width="24" height="18" align="top"></picture> <sub>by <a href="https://alfasixbh.com">Alfa Six</a></sub></p>

The demo is an ordinary Laravel 13 application that lives inside the monorepo: Composer and pnpm resolve `alfasix/alfakit` and the `@alfakit/*` renderers from `../packages`, so deploy the **whole repository** and build the packages before the demo.

## Requirements

- PHP 8.3+ with `pdo_sqlite`, `intl`, `mbstring`, `fileinfo`
- Node 22+ and pnpm 10 (build time, and at runtime for server-side rendering)
- A process supervisor (systemd, Supervisor, Forge daemons) for the SSR server
- Cron for the scheduler

## First deploy

```bash
# repository root
pnpm install --frozen-lockfile
pnpm build                                   # @alfakit/core first, then the three renderers

cd demo
composer install --no-dev --optimize-autoloader
cp .env.example .env                         # APP_ENV=production, APP_DEBUG=false
php artisan key:generate
touch database/database.sqlite
php artisan storage:link                     # public/demo-files -> storage/app/demo (config/filesystems.php "links")
php artisan demo:reset                       # migrate:fresh --seed + product artwork on the demo disk
pnpm --filter @alfakit/demo build:ssr        # public/build + bootstrap/ssr/ssr.js
php artisan optimize                         # config, routes, views
php artisan alfakit:optimize                 # cache discovered resources, pages and widgets
```

Set `APP_URL` to the public URL (for example `https://demo.alfakit.dev`): the `demo` disk builds its file URLs from it (`/demo-files/...`) and the social card in the page head uses it.

Uploads and product artwork live on the `demo` disk (`storage/app/demo`), served by the web server through the `public/demo-files` symlink that `storage:link` creates. Make `storage/` and `bootstrap/cache/` writable by the web user.

## Environment

| Key                                       | Value                             | Why                                                                                                             |
| ----------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `APP_ENV` / `APP_DEBUG`                   | `production` / `false`            | Branded error pages instead of stack traces; the AlfaKit debug panel is off in `DemoPanel` regardless.          |
| `DB_CONNECTION`                           | `sqlite`                          | One file, rebuilt every hour.                                                                                   |
| `SESSION_DRIVER`, `CACHE_STORE`           | `file`                            | `demo:reset` deletes the file sessions so visitors land on the login page after a reset.                        |
| `QUEUE_CONNECTION`                        | `sync`                            | Imports, exports and notifications run in the request; no worker needed.                                        |
| `MAIL_MAILER`                             | `log`                             | Invitations, contact messages and e-mail codes are written to `storage/logs`, never sent.                       |
| `ALFAKIT_FILESYSTEM_DISK`                 | `demo`                            | All uploads go to the disk that `demo:reset` empties.                                                           |
| `ALFAKIT_UPLOAD_MAX_KB`                   | `4096`                            | Per-file upload cap. Upload requests are also throttled (`demo-uploads`: 20 a minute, 100 an hour per visitor). |
| `ALFAKIT_POWERED_BY`                      | `true`                            | "Powered by AlfaKit · Alfa Six" on the plugin pages customers see (CMS, forms, helpdesk, invoices).             |
| `ALFAKIT_POWERED_BY_EMAILS`               | `true`                            | The same line at the end of AlfaKit emails.                                                                     |
| `DEMO_SEED_SCALE`                         | `1`                               | Size of the seeded shop (`0.1` for a small box).                                                                |
| `INERTIA_SSR_ENABLED` / `INERTIA_SSR_URL` | `true` / `http://127.0.0.1:13720` | Only after the SSR server below is running.                                                                     |

## Server-side rendering

One Node process renders all three frontends: `bootstrap/ssr/ssr.js` imports the React, Vue and Svelte servers and dispatches on the panel id of each page (storefront pages on the `renderer` prop). It listens on **port 13720** (`App\Demo\Renderer::SSR_PORT`).

```ini
# /etc/supervisor/conf.d/alfakit-demo-ssr.conf
[program:alfakit-demo-ssr]
command=node bootstrap/ssr/ssr.js
directory=/var/www/alfakit/demo
autostart=true
autorestart=true
user=www-data
stdout_logfile=/var/www/alfakit/demo/storage/logs/ssr.log
redirect_stderr=true
```

Restart it after every `build:ssr`. If it is down, Inertia falls back to client-side rendering, so the demo keeps working.

## Scheduler: the hourly reset

`routes/console.php` schedules `demo:reset` hourly (`withoutOverlapping`). Add the usual cron entry:

```cron
* * * * * cd /var/www/alfakit/demo && php artisan schedule:run >> /dev/null 2>&1
```

The reset puts the application into maintenance mode for the second or two it takes (visitors see the branded "Back shortly" page), empties the `demo` disk and the temporary upload directory, runs `migrate:fresh --seed`, deletes file sessions and brings the application back up. The sidebar shows the minutes until the next reset.

## Public-demo safeguards (already configured)

- One shared login, `demo@alfakit.dev` / `password`, shown on the login page. Its e-mail address, password and second factors can't be changed (`App\Alfakit\Auth\EditProfile`); impersonate a colleague from **Settings › Staff** to try two-factor set-up.
- Only the shared account may impersonate (`User::canImpersonate()`), and never an admin.
- Registration and password reset are off; tenant registration ("Open a new store") stays on and disappears with the next reset.
- Rate limits: uploads (middleware), imports and exports (`rateLimit` on the actions), storefront contact, review and newsletter forms, staff invitations and review approvals.
- First-party plugins: webhooks never deliver (disabled sample endpoint, read-only policy, `demo-null` queue connection), Ops is read-only (no log viewer: the `log` mailer writes e-mails and sign-in codes there), backups are view-only, AI uses local sample answers (leave the AI provider keys unset), billing checkout is disabled, file sharing is off. Leave `QUEUE_CONNECTION=sync` and `MAIL_MAILER=log`.

## Updating

```bash
git pull
pnpm install --frozen-lockfile && pnpm build
cd demo && composer install --no-dev --optimize-autoloader
pnpm --filter @alfakit/demo build:ssr
php artisan optimize && php artisan alfakit:optimize
php artisan demo:reset
supervisorctl restart alfakit-demo-ssr
```
