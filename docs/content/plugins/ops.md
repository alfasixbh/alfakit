---
title: Ops
description: Failed jobs, queues and batches, the scheduler, logs, cache and maintenance mode, and system information in your panel.
---

# Ops

`alfasix/alfakit-ops` is an operations toolkit for a panel. It adds an **Operations** item to the navigation with these pages:

- **Overview**: a card per feature (failed jobs, pending jobs, running batches, the next scheduled task, maintenance mode), each linking to its page, and the **system information** card: PHP, Laravel and AlfaKit versions, the environment (with a warning when debug mode is on, red in production), the queue, cache, session, mail and database drivers, and the free disk space.
- **Failed jobs**: Laravel's failed jobs with search and filters (queue, connection, job class, failed between two dates), a viewer with the full exception and the payload with sensitive values hidden, **Retry**, **Retry selected**, **Retry all**, **Forget**, **Forget selected** and **Flush**.
- **Queues**: pending, delayed and reserved jobs per queue, the age of the oldest pending job, and **Clear**.
- **Batches**: job batches with their progress, failures and status, **Retry failed jobs** and **Cancel**.
- **Scheduler**: every scheduled task with its frequency in words, the cron expression, the next run in the panel's timezone, its own timezone, `withoutOverlapping()`, `onOneServer()`, background and environment settings, the last run (status, exit code, duration, output) and **Run now**.
- **Logs**: the files of the log directory (daily and single), and for each file its Monolog entries newest first, filtered by level and searched, with the context and stack trace of each entry, **Download**, **Empty file** and **Delete**.
- **Maintenance**: the application, configuration, route, view, event, compiled, AlfaKit and scheduler lock caches with their status, **Clear** and **Cache** per cache, **Optimize** (`optimize`), **Clear all caches** (`optimize:clear`), and maintenance mode with a secret bypass link.

Everything is built from AlfaKit's pages, tables, widgets and actions, so it renders in React, Vue and Svelte, works right to left and is translated into every AlfaKit language. There is no frontend package and no extra Composer dependency.

Works on an [admin panel](../getting-started/installation) and on a [starter kit](../getting-started/starter-kits) panel (`->starterKit()`), where its pages are listed in your app's sidebar. It needs a panel, so it doesn't apply to [standalone](../standalone/overview) components.

## Installation

```bash
composer require alfasix/alfakit-ops
```

Register the plugin and decide who may use it:

```php
use AlfaSix\AlfakitOps\OpsPlugin;
use App\Models\User;

$panel->plugin(
    OpsPlugin::make()
        ->authorize(fn (User $user): bool => $user->is_admin),
);
```

`$user->is_admin` stands for your own check: a new Laravel app's `users` table has no such column, so use a role, a gate or a column you add. The closure's `bool` return type is strict: SQLite returns `0`/`1` and a model created without the attribute holds `null`, so cast the column to `boolean` and give it a default, or return `(bool) $user->is_admin`.

The pages live under `/{panel}/ops` (`/admin/ops/failed-jobs`, `/admin/ops/logs`…).

The failed jobs page reads Laravel's failer (`queue.failed`), the batches page the `job_batches` table (`php artisan make:queue-batches-table`), the queues page the `jobs` table of database connections and Redis.

## Authorisation

**Nothing is visible until you allow it.** Without `authorize()`, only users the `viewAlfakitOps` gate allows may open the pages; guests never may.

```php
// In a service provider:
Gate::define('viewAlfakitOps', fn (User $user): bool => $user->hasRole('developer'));
```

```php
OpsPlugin::make()
    ->authorize(fn (User $user): bool => $user->is_admin) // replaces the gate check
    ->gate('manageServers')                                // or check another gate
```

### Per action

`authorizeActions()` narrows what an authorised user may do. It receives the ability and the user; an `OpsPlugin::ABILITY_*` constant names each kind of action:

| Ability                       | Actions                             |
| ----------------------------- | ----------------------------------- |
| `ABILITY_RETRY_FAILED_JOBS`   | Retry, Retry selected, Retry all    |
| `ABILITY_FORGET_FAILED_JOBS`  | Forget, Forget selected             |
| `ABILITY_FLUSH_FAILED_JOBS`   | Flush                               |
| `ABILITY_CLEAR_QUEUES`        | Clear a queue                       |
| `ABILITY_RETRY_BATCHES`       | Retry the failed jobs of a batch    |
| `ABILITY_CANCEL_BATCHES`      | Cancel a batch                      |
| `ABILITY_RUN_SCHEDULED_TASKS` | Run now                             |
| `ABILITY_DOWNLOAD_LOGS`       | Download a log file                 |
| `ABILITY_DELETE_LOGS`         | Empty or delete a log file          |
| `ABILITY_CLEAR_CACHES`        | Clear a cache, Clear all caches     |
| `ABILITY_OPTIMIZE`            | Cache, Optimize                     |
| `ABILITY_MAINTENANCE_MODE`    | Enable and disable maintenance mode |

```php
OpsPlugin::make()
    ->authorize(fn (User $user): bool => $user->is_staff)
    ->authorizeActions(fn (string $ability, User $user): bool => $user->is_admin
        || in_array($ability, [OpsPlugin::ABILITY_RETRY_FAILED_JOBS, OpsPlugin::ABILITY_DOWNLOAD_LOGS], true))
```

`readOnly()` denies every action except downloading logs. Unauthorised actions are hidden, and the server refuses them even when they are posted directly.

`requiresPasswordConfirmation()` asks for the user's password before destructive actions: flushing failed jobs, clearing a queue, cancelling a batch, running a scheduled task, emptying or deleting a log file and enabling maintenance mode.

```php
OpsPlugin::make()
    ->readOnly(fn (): bool => app()->isProduction())
    ->requiresPasswordConfirmation();
```

### Tenancy

Operations are global: failed jobs, queues, logs and caches belong to the whole application, never to a tenant. So the plugin hides itself on panels with tenancy (the pages answer 403 and leave the navigation). Opt in on a panel whose tenants are all staff:

```php
OpsPlugin::make()->allowOnTenantPanels();
```

## Options

```php
OpsPlugin::make()
    // Features: false removes the page and its routes; a closure is checked per request.
    ->overview(true)
    ->failedJobs(true)
    ->queues(true)
    ->batches(true)
    ->scheduler(fn (User $user): bool => $user->is_admin)
    ->logs(true)
    ->maintenance(false)
    ->dashboardWidget()                       // the system information card on the dashboard

    // Failed jobs
    ->redactKeys(['iban', 'card_holder'])     // added to the defaults
    ->redactKeys(['password'], merge: false)  // replaces them

    // Queues
    ->monitorQueues(['redis' => ['default', 'emails'], 'database' => 'reports'])
    ->pollingInterval('30s')                  // default '10s'; null turns polling off

    // Scheduler
    ->runScheduledTasksOnQueue(queue: 'ops', connection: 'redis')

    // Logs
    ->logDirectory(storage_path('logs'))      // the default
    ->logFiles(['*.log', 'worker-*.txt'])     // default '*.log'
    ->downloadLinkLifetime(10)                // minutes a download link stays valid (default 5)

    // Navigation (the "Operations" item)
    ->navigationLabel('Operations')
    ->navigationGroup('System')
    ->navigationIcon('server-cog')            // default
    ->navigationSort(90)
    ->registerNavigation(true);
```

Closures get `$plugin`, `$panel` and `$user` injected. `OpsPlugin::get()` returns the plugin of the current panel; `->can(OpsPlugin::ABILITY_…)` and `->isAuthorized()` answer for the current user.

## Failed jobs

The table lists the failer's jobs, newest first: the job's display name with the first line of its exception, the queue, the connection, the attempts and when it failed. Database failers (`database`, `database-uuids`) are searched, filtered, sorted and paged in SQL; other failers (`file`, DynamoDB) are read through the failer's `all()`.

**View** shows the job's UUID, ID, connection, queue, attempts and date, the full exception, and the payload as JSON. The serialized command (`data.command`) is read **without `unserialize()`**: no class is loaded and no magic method runs. It is shown as a tree, and the values of sensitive keys are replaced with `[redacted]`. Keys are compared word by word, case insensitively: `token` hides `token`, `api_token`, `apiToken` and `X-Token`, but not `tokenizer`. The defaults are `password`, `passwd`, `pwd`, `secret`, `token`, `api_key`, `apikey`, `access_key`, `private_key`, `authorization`, `cookie`, `credit_card`, `card_number`, `cvv`, `cvc`, `iban`, `ssn` and `pin`. A command that can't be read (an encrypted job, an unknown format) is hidden altogether when it mentions a sensitive key.

**Retry** runs `queue:retry` with the job's ID, so it behaves exactly like the command. **Retry selected** and **Forget selected** work across pages: "select all" applies to every job that matches the search and filters.

## Queues

Without `monitorQueues()` the page lists the default connection's queue, plus every queue that has jobs in the `jobs` table of each database connection. For database and Redis connections it shows pending, delayed and reserved jobs and the oldest pending job; other drivers (SQS, Beanstalkd) show their `size()`. Redis is only asked when phpredis or Predis is installed. A connection that can't be reached shows its error in the row instead of breaking the page. `sync` and `null` connections hold no jobs and are skipped.

**Clear** deletes every job of the queue (`ClearableQueue::clear()`).

## Batches

Batches come from the `job_batches` table (`queue.batching.database` and `queue.batching.table`): name, ID, status (running, finished, has failures, cancelled), progress, pending and failed jobs, created and finished times. Filter by status. **Retry failed jobs** runs `queue:retry-batch`; **Cancel** cancels the batch, so its jobs that haven't started don't run.

## Scheduler

The schedule is read as `schedule:list` reads it, in web requests too (the console kernel is bootstrapped so `routes/console.php` and `withSchedule()` are loaded). Frequencies are put into words in the user's language ("Every 5 minutes", "Weekdays at 08:30", "Monthly on day 1 at 00:00"); unusual expressions show the expression itself. The next run is computed in the task's timezone and shown in the panel's.

The last run is recorded from the scheduler's own `ScheduledTaskFinished` and `ScheduledTaskFailed` events and from **Run now**, in the default cache store. **Last run** shows its status, exit code, duration, who started it and its output, and the end of the task's output file when it has one (`sendOutputTo()`, `appendOutputTo()`).

**Run now** runs the task during the request:

- Artisan commands run through the console kernel (`Artisan::call()`), with the task's `before()` and `after()` callbacks; their output is captured;
- shell commands run as the scheduler runs them, in the foreground, with their output captured;
- closures and `Schedule::job()` tasks are called.

`withoutOverlapping()` is respected: a task that is already running is skipped. Environment filters and `when()` conditions are not: running a task by hand is a deliberate choice. With `runScheduledTasksOnQueue()` the task is queued (`AlfaSix\AlfakitOps\Jobs\RunScheduledTaskJob`) and its result appears as the last run once a worker ran it; use it for long tasks.

## Logs

The **Logs** page lists the files directly inside the log directory that match the patterns, newest first, with their size and type (daily files end in `-YYYY-MM-DD`). Open one to browse its entries at `/{panel}/ops/logs/{file}`.

Entries are parsed from Laravel's Monolog line format (`[2026-10-14 09:30:12] production.ERROR: Message {"context"} []`): level, date, channel, message and context (pretty JSON, or the raw stack trace of an exception). Lines without a header belong to the entry above them.

Files are read **from the end**, in 64 KB chunks, a page at a time: memory stays bounded however large the file is, and the newest entries of a 2 GB file load as fast as those of a small one. Pages are "previous / next" (the total is never counted). An entry longer than 256 KB is cut, with a note. Filter by level and search the message and context.

**Download** opens a temporary signed link (`/{panel}/ops/logs/{file}/download?signature=…`). **Empty file** truncates the file (processes that have it open keep writing to it); **Delete** removes it.

### Path traversal

A log file is addressed by its name only. Every read, download and deletion goes through `LogFiles::resolve()`, which accepts a name only when it is a plain file name (letters, digits, `.`, `_`, `-`; no `/`, `\`, `..` or null byte) matching the configured patterns, and when its real path, with symbolic links resolved, is a readable file directly inside the real log directory. A symbolic link that points out of the directory is refused. The download route also checks the signature and its expiry, the plugin's authorisation and the download ability.

## Cache and maintenance

Each cache runs its Artisan command: `cache:clear`, `config:clear` / `config:cache`, `route:clear` / `route:cache`, `view:clear` / `view:cache`, `event:clear` / `event:cache`, `clear-compiled`, `alfakit:optimize-clear` / `alfakit:optimize` and `schedule:clear-cache` (which frees a task stuck as "running" by an overlap lock). The status column shows whether the configuration, routes, events, compiled services, views and AlfaKit discovery are cached. Commands that aren't registered are left out.

**Enable maintenance mode** asks for a bypass secret (a random 32-character one is filled in; 16 to 128 letters, digits, `-` or `_`), and optionally the `Retry-After` and refresh seconds, then runs `php artisan down --secret=…`. You are then sent through the bypass link, which sets the bypass cookie in your browser and brings you back to the page, so you keep access while visitors see the maintenance page. The page shows the bypass link while maintenance mode is on. **Disable maintenance mode** runs `php artisan up`.

## Security notes

- Deny by default: no `authorize()` and no `viewAlfakitOps` gate means nobody sees the pages.
- Every action checks `authorize()` and `authorizeActions()` on the server.
- Failed job payloads are never unserialized, and sensitive values are redacted before they leave the server. Exception messages are shown as they were logged: don't put secrets in them.
- Log files outside the log directory can't be read, downloaded or deleted, whatever the name or link.
- Downloads use short-lived signed links.
- Maintenance mode always uses a secret, and the form refuses short or path-like secrets.
- Consider `readOnly()` or `requiresPasswordConfirmation()` in production.

## Your own pages

The data behind the pages is available to your own pages and widgets:

```php
use AlfaSix\AlfakitOps\Support\BatchRepository;
use AlfaSix\AlfakitOps\Support\FailedJobRepository;
use AlfaSix\AlfakitOps\Support\LogFiles;
use AlfaSix\AlfakitOps\Support\LogReader;
use AlfaSix\AlfakitOps\Support\QueueMonitor;
use AlfaSix\AlfakitOps\Support\ScheduledTasks;

FailedJobRepository::count();
QueueMonitor::totalPending();
BatchRepository::runningCount();
ScheduledTasks::rows();
if (($path = LogFiles::resolve('laravel.log')) !== null) {
    $errors = LogReader::paginate($path, page: 1, perPage: 50, levels: ['error']);
}
```

`AlfaSix\AlfakitOps\Widgets\SystemInfoWidget` and `OpsOverviewWidget` can be added to any dashboard; they check the plugin's authorisation themselves.
