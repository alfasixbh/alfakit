---
title: Database per tenant
description: Run each tenant on its own database with AlfaKit's tenancy.
---

# Database per tenant

AlfaKit's [tenancy](tenancy) scopes queries in one shared database by default. If each tenant needs its own database (for data isolation, compliance or size), keep the tenants table and users in a central database and switch the connection once the tenant is known. AlfaKit fires `AlfaSix\Alfakit\Events\TenantSet` as soon as it has resolved and authorised the tenant, for page requests and for internal (`/_alfakit`) requests alike, so that is the place to switch.

## Central and tenant connections

```php
// config/database.php
'connections' => [
    'central' => [/* users, teams, team_user, sessions, jobs, notifications */],
    'tenant' => [
        'driver' => 'mysql',
        'database' => null, // set per request
        // host, username, password…
    ],
],
```

Models that live in every tenant database use the `tenant` connection; `User`, `Team` and the membership table stay on `central` (the panel looks the tenant up and checks membership before switching).

```php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    protected $connection = 'tenant';
}
```

## Switching on `TenantSet`

```php
use AlfaSix\Alfakit\Events\TenantSet;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;

Event::listen(function (TenantSet $event): void {
    config(['database.connections.tenant.database' => $event->tenant->database_name]);

    DB::purge('tenant');
    DB::reconnect('tenant');
});
```

Read the database name from the tenant record, never from the request. Because the tenant has already been checked against the signed-in user when the event fires, a user can't reach another tenant's database by changing the URL or the context token.

## Things to keep in mind

- **Ownership scoping is optional.** With one database per tenant, rows don't need a `team_id`; set `protected static bool $isScopedToTenant = false;` on resources whose models live only in tenant databases, or keep the column if you also want the shared-database safety net.
- **Validation rules** such as `unique()` and `exists()` use the model's connection when you pass a model class (`->unique(Project::class)`); with a table name, prefix it with the connection: `->unique('tenant.projects')`.
- **Queues and scheduled jobs** don't run inside a request: pass the tenant key to the job and switch the connection in the job's `handle()` (or a job middleware) the same way.
- **Long-lived workers (Octane).** AlfaKit forgets the tenant at the end of every request; also reset the `tenant` connection (`DB::purge('tenant')`) in a `RequestTerminated` listener so the next request doesn't reuse it.
- **Uploads**: combine with `->tenantUploadDirectory()` or a disk per tenant so files are separated too.
- **Notifications** are stored in the central database by default (the `notifications` table of the user's connection) and are already [scoped per tenant](tenancy#notifications-and-uploads-per-tenant).
- **Migrations**: run tenant migrations against each database (`php artisan migrate --database=tenant --path=database/migrations/tenant` after switching), for example from your tenant registration page's `handleRegistration()`.

Packages such as `stancl/tenancy` automate these steps; they work alongside AlfaKit as long as tenant identification happens on `TenantSet` (or in a `tenantMiddleware()`) rather than from the raw URL.
