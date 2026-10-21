---
title: API
description: Automatic, secure JSON REST APIs for your resources, with tokens, OpenAPI and an API reference page.
---

# API

`alfasix/alfakit-api` turns the resources of a panel into a JSON REST API. You don't write controllers, requests or transformers: the API runs the resource's own table, form and policies, so the API and the panel can't drift apart.

| Feature       | How it works                                                                                                                                        |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Endpoints     | `index`, `show`, `store`, `update`, `destroy`, and the table's bulk actions you choose, under a versioned prefix (`/api/v1/posts`)                  |
| Listing       | Pagination, sorting by the table's sortable columns, `search` over its searchable columns, `filter[…]` with its filters, sparse fieldsets, includes |
| Validation    | The resource form's rules, through the same pipeline as the panel (defaults, hidden and read-only fields, `mutateFormDataBefore…()`, page hooks)    |
| Output        | An explicit field whitelist; attributes in the model's `$hidden` are never returned                                                                 |
| Authorisation | The resource's policy on every call (`viewAny`, `view`, `create`, `update`, `delete`), plus the token's abilities                                   |
| Tenancy       | Records are scoped to the tenant in the URL (or bound to the token), and tokens only work for the tenant they were created in                       |
| Tokens        | Hashed personal access tokens with per-resource abilities, expiry and last use, managed on an "API tokens" page                                     |
| HTTP          | Per-token rate limiting, RFC 9457 `application/problem+json` errors, `ETag` / `If-None-Match` / `If-Match`, `Idempotency-Key` for `store`           |
| Documentation | An OpenAPI 3.1 document (`/api/v1/openapi.json`) and an "API reference" page in the panel                                                           |

Everything in the panel is built from AlfaKit components (tables, action modals, infolists), so it renders in React, Vue and Svelte; there is no frontend package.

## Installation

```bash
composer require alfasix/alfakit-api
php artisan vendor:publish --tag=alfakit-api-migrations
php artisan migrate
```

The migration creates `alfakit_api_tokens`. Laravel Sanctum is not needed: the plugin ships its own token store (see [Tokens](#tokens)).

Register the plugin and list the resources to expose:

```php
use AlfaSix\AlfakitApi\ApiPlugin;

public function panel(Panel $panel): Panel
{
    return $panel
        // …
        ->resources([PostResource::class, CategoryResource::class])
        ->plugin(
            ApiPlugin::make()->resources([PostResource::class, CategoryResource::class]),
        );
}
```

Users create a token on the new **API tokens** page and call the API with it:

```bash
curl https://example.com/api/v1/posts?sort=-published_at&include=author \
  -H "Authorization: Bearer 1|Yf3…" \
  -H "Accept: application/json"
```

## Exposing resources

A resource is exposed only when you opt in, in one of two ways.

List it in the plugin, as a class (default configuration) or as a `ResourceApi`:

```php
use AlfaSix\AlfakitApi\ResourceApi;

ApiPlugin::make()->resources([
    CategoryResource::class,
    ResourceApi::make(PostResource::class)
        ->fields(['id', 'title', 'status', 'published_at', 'excerpt' => fn (Post $record): string => Str::limit($record->body, 120)])
        ->includes(['author' => ['id', 'name'], 'tags' => ['id', 'name']])
        ->bulkActions(['publish'])
        ->operations(['index', 'show', 'store', 'update']),
]);
```

Or let the resource configure itself by implementing `ExposesApi`. Such resources are exposed on every panel that has the plugin, without being listed:

```php
use AlfaSix\Alfakit\Resources\Resource;
use AlfaSix\AlfakitApi\Contracts\ExposesApi;
use AlfaSix\AlfakitApi\ResourceApi;

class PostResource extends Resource implements ExposesApi
{
    public static function api(ResourceApi $api): ResourceApi
    {
        return $api->fields(['id', 'title', 'status'])->readOnly();
    }
}
```

A resource listed as a class that has a static `api()` method gets that configuration too.

### `ResourceApi` options

| Method                                      | Default                           | Does                                                                                                                                            |
| ------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `slug(?string)`                             | the resource slug                 | The URL segment: `/api/v1/{slug}`                                                                                                               |
| `operations(array)`                         | all five                          | Any of `index`, `show`, `store`, `update`, `destroy`; the others are not routed                                                                 |
| `readOnly()`                                |                                   | Only `index` and `show`                                                                                                                         |
| `fields(array)`                             | see below                         | The output whitelist: attribute names, or `'name' => fn (Model $record) => …` computed fields                                                   |
| `hiddenFields(array)`                       | `[]`                              | Fields never returned, on top of the model's `$hidden`                                                                                          |
| `writableFields(?array)`                    | every visible, enabled form field | Narrow the form fields `store` / `update` accept                                                                                                |
| `includes(array)`                           | `[]`                              | Relations clients may embed with `?include=`: `'author' => ['id', 'name']`, or `'author'` alone (the related resource's API fields, or its key) |
| `bulkActions(array)`                        | `[]`                              | Table bulk actions clients may run, by name (`POST /api/v1/posts/bulk/{name}`)                                                                  |
| `modifyQueryUsing(?Closure)`                |                                   | Narrow the API's query further: `fn (Builder $query) => $query->where('is_public', true)`                                                       |
| `defaultPerPage(?int)` / `maxPerPage(?int)` | the plugin's                      | Page sizes for this resource                                                                                                                    |
| `description(string\|Closure\|null)`        |                                   | Shown in the OpenAPI document and the API reference                                                                                             |

Without `fields()`, a record returns its primary key, the form fields and table columns that are real attributes (table columns, `$appends` or accessors; relationship columns like `author.name` are left out) and the timestamps. Attributes in the model's `$hidden` (or outside a non-empty `$visible`) are never returned, even when `fields()` or an include lists them.

## Endpoints

```
GET    /api/v1/openapi.json                    the OpenAPI document
GET    /api/v1/token                           the token you are using
GET    /api/v1/{resource}                      list
POST   /api/v1/{resource}                      create
GET    /api/v1/{resource}/{record}             show
PATCH  /api/v1/{resource}/{record}             update (PUT does the same)
DELETE /api/v1/{resource}/{record}             delete
POST   /api/v1/{resource}/bulk/{action}        run an exposed bulk action
```

`{record}` is the resource's route key (`$recordRouteKeyName`, else the model's). On tenancy panels the tenant comes first: `/api/v1/{tenant}/posts` (see [Tenancy](#tenancy)).

### Listing

```
GET /api/v1/posts?page=2&per_page=25&sort=-published_at&search=laravel&filter[status]=published&fields=id,title&include=author
```

| Parameter          | Uses                                                                                                                                                                                                                               |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `page`, `per_page` | Pagination (`per_page` up to the plugin's `maxPerPage()`, 100 by default)                                                                                                                                                          |
| `sort`             | A visible, sortable table column; `-` in front for descending. Without it, the table's default sort applies                                                                                                                        |
| `search`           | The table search: its searchable columns, `searchable([...])` attributes or `searchUsing()`                                                                                                                                        |
| `filter[name]`     | The table's filters: `filter[status]=published`, multiple selects take `filter[tags]=1,2`, ternary and toggle filters take `true` / `false`, and filters with their own form take their fields: `filter[created][from]=2026-01-01` |
| `fields`           | A comma-separated subset of the resource's fields                                                                                                                                                                                  |
| `include`          | Comma-separated relations from `includes()`                                                                                                                                                                                        |

Unknown sorts, filters, fields and includes are a `400` problem that lists the allowed values. Filter defaults and the table's `baseQuery()` / `modifyQueryUsing()` apply, as in the panel.

```json
{
    "data": [{ "id": 12, "title": "Hello", "author": { "id": 3, "name": "Ada" } }],
    "meta": {
        "current_page": 2,
        "per_page": 25,
        "total": 31,
        "last_page": 2,
        "from": 26,
        "to": 31
    },
    "links": { "first": "…?page=1", "last": "…?page=2", "prev": "…?page=1", "next": null }
}
```

### Creating and updating

The body is a JSON object of form fields. The API builds the resource's own Create or Edit page (or a stand-in for resources without one), fills the form, applies the request and validates it with the form's rules. Then it runs the same steps as the panel: `beforeValidate`, `afterValidate`, `beforeCreate` / `beforeSave`, `mutateFormDataBeforeCreate()` / `mutateFormDataBeforeSave()`, `handleRecordCreation()` / `handleRecordUpdate()` (tenant association included), relationship fields, then `afterCreate` / `afterSave`.

- Fields a create request leaves out get their form defaults; fields an update leaves out keep the record's values (`PUT` behaves like `PATCH`).
- Keys that aren't writable form fields are ignored; hidden and read-only fields keep their server value, as in the panel.
- `$this->halt()` in a hook answers `409`.
- File upload fields are not supported over the API, and nested resources (`$parentResource`) are not exposed.

`store` answers `201` with `Location` and `ETag`; `update` answers `200`; `destroy` answers `204`.

### Bulk actions

```bash
curl -X POST https://example.com/api/v1/posts/bulk/publish \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"ids": [1, 2, 3], "data": {}}'
```

Only actions named in `bulkActions()` are routed. The selection is limited to the resource's (tenant-scoped) query, the action's own `authorize()`, `authorizeIndividualRecords()` and form validation (`data`) run, and the answer is `{"data": {"action": "publish", "count": 3}}`. At most 1000 keys per request.

## Tokens

Tokens read `{id}|{40 random characters}`. Only the SHA-256 hash of the secret is stored and it is compared in constant time; the plain text is shown once, right after it is created. Every request checks that the token exists, was issued on this panel and hasn't expired, and that its user may still use the panel (`CanAccessPanel`).

### Abilities

| Ability              | Allows                    |
| -------------------- | ------------------------- |
| `posts:read`         | `index` and `show`        |
| `posts:create`       | `store`                   |
| `posts:update`       | `update`                  |
| `posts:delete`       | `destroy`                 |
| `posts:bulk:publish` | the `publish` bulk action |
| `posts:*`            | everything on `posts`     |
| `*`                  | everything                |

Abilities only narrow what a token can do: the user's policies are checked on every request too. A missing ability is a `403` problem with `type` `…/insufficient-ability` and the `ability` it needed.

### The "API tokens" page

Users name the token, pick an expiry and choose "Full access" or abilities per resource and operation (only the operations each resource exposes are offered). The list shows the abilities, last use and expiry, with a "Revoke" action. On tenancy panels the page lists and creates the tokens of the current tenant.

```php
ApiPlugin::make()
    ->tokenExpirationOptions([7, 30, 90, null], default: 30) // days; null is "never"
    ->canManageTokens(fn (User $user): bool => $user->is_developer)
    ->tokensPage(MyApiTokens::class) // a subclass of ApiTokens, or false to remove it
```

### Issuing tokens from code

```php
$plugin = ApiPlugin::get(alfakit()->getPanel('admin'));

$token = $plugin->getTokenRepository()->create(
    user: $user,
    panelId: 'admin',
    name: 'Billing sync',
    abilities: ['invoices:read'],
    expiresAt: now()->addYear(),
    tenant: $team, // on tenancy panels
);

$token->plainTextToken; // show it once
```

### Sanctum and other token stores

Sanctum is not required. With `laravel/sanctum` installed (and its `personal_access_tokens` table migrated), store API tokens as Sanctum personal access tokens, so the same tokens also work on your `auth:sanctum` routes:

```php
use AlfaSix\AlfakitApi\Tokens\SanctumTokenRepository;

ApiPlugin::make()->tokenRepository(new SanctumTokenRepository);
```

Tokens keep the Sanctum format (`{id}|{secret}`, with `sanctum.token_prefix` and a checksum) and Sanctum's rules (`expires_at` and `sanctum.expiration`). Sanctum has no panel or tenant columns, so the repository records them as marker abilities (`alfakit-panel:{id}`, `alfakit-tenant:{type}:{key}`), which `getAbilities()` and `GET /token` leave out; abilities keep the API's wildcards (`posts:*`). Tokens your app creates with `$user->createToken()` have no panel marker and are refused; `new SanctumTokenRepository(panelBound: false)` accepts them too (give them `posts:read`-style abilities or `*`). The "API tokens" page lists, creates and revokes Sanctum tokens through the repository. The user model doesn't need `HasApiTokens`.

For another store (an OAuth server…), implement `AlfaSix\AlfakitApi\Contracts\TokenRepository` (`create`, `find`, `touch`, `revoke`) returning `AccessToken` implementations. Implement `Contracts\QueryableTokenRepository` (`tokensQuery()`, Eloquent models with `name`, `last_used_at`, `expires_at` and `created_at`) and the "API tokens" page lists them; otherwise replace the page (`tokensPage()`).

## Tenancy

On panels with `tenant()`:

- URLs carry the tenant: `/api/v1/{tenant}/posts`, resolved like the panel's (`slugAttribute` or key), and the user must still belong to it (`HasTenants::canAccessTenant()`).
- Tokens are created for the current tenant and only work for it: another tenant in the URL is a `403`, even one the user belongs to. Removing the user from the tenant stops the token.
- Queries go through `getEloquentQuery()`, so records of other tenants are `404`, and new records are associated with the tenant exactly as the Create page does.

With `->tenantFromToken()` the URLs have no tenant segment and every request uses the token's tenant.

## HTTP features

### Errors

Every error is an [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) problem document (`Content-Type: application/problem+json`), including validation failures, aborts in your own code and unknown URLs under the prefix:

```json
{
    "type": "https://alfakit.dev/problems/validation",
    "title": "Unprocessable Content",
    "status": 422,
    "detail": "The given data was invalid.",
    "instance": "/api/v1/posts",
    "errors": { "title": ["The title field is required."] }
}
```

`type` is one of `validation`, `unauthenticated`, `forbidden`, `insufficient-ability`, `not-found`, `invalid-parameter`, `invalid-body`, `rate-limited`, `precondition-failed`, `idempotency-mismatch`, `idempotency-in-progress`, `halted` and `server-error` (under `https://alfakit.dev/problems/`), or `about:blank`. With `APP_DEBUG` on, `500`s add a `debug` member with the exception.

### Rate limiting

60 requests per minute and token by default, with `X-RateLimit-Limit` / `X-RateLimit-Remaining` on every response and `Retry-After` on `429`s.

```php
ApiPlugin::make()->rateLimit(120);
ApiPlugin::make()->rateLimit(fn (AccessToken $token, User $user): ?int => $user->is_partner ? 1000 : 60);
ApiPlugin::make()->rateLimit(null); // off
```

### ETags

`show` returns a strong `ETag` and `Cache-Control: private, no-cache`; `If-None-Match` answers `304`. `update` and `destroy` honour `If-Match` (the `ETag` of the record's full representation, as `show` returns it without `fields` or `include`) and answer `412` when the record changed.

### Idempotency keys

Send `Idempotency-Key: <unique string>` with `store` to retry safely: the first successful response is stored for a day and replayed (with `Idempotent-Replayed: true`) for the same token, tenant and resource. The same key with another body is a `422`; a retry while the first request still runs is a `409`.

```php
ApiPlugin::make()->idempotency(ttlMinutes: 60, store: 'redis');
```

## Documentation

`GET /api/v1/openapi.json` returns an OpenAPI 3.1 document: every route, request bodies inferred from the form fields and their rules (types, formats, enums, lengths, required fields), response schemas from the field whitelist and the model's casts and columns, list parameters from the table, abilities (`x-ability`), the bearer security scheme and the shared problem responses. It needs a token (any ability) unless you call `->publicDocumentation()`. Readers only see the resources they may list (`viewAny`).

The **API reference** page renders the same document in the panel: the base URL, authentication and rate limit, every resource's endpoints with their method, path, summary and ability, fields, list parameters and example request and response bodies, and the error format. Its "OpenAPI document" button opens `{panel}/api-docs/openapi.json`, which uses the panel's own sign-in, to import it into Postman, Insomnia or a code generator.

```php
ApiPlugin::make()
    ->title('Acme API')
    ->description('Orders and invoices.')
    ->documentationPage(false) // or a subclass of ApiDocumentation
    ->canViewDocumentation(fn (User $user): bool => $user->is_developer)
```

## Plugin options

| Method                                    | Default                                 | Does                                                             |
| ----------------------------------------- | --------------------------------------- | ---------------------------------------------------------------- |
| `resources(array)`                        | `[]`                                    | Resource classes or `ResourceApi` configurations                 |
| `prefix(?string)`                         | `api` (default panel), `api/{panel id}` | The URL prefix before the version                                |
| `version(string)`                         | `v1`                                    | The version segment                                              |
| `domain(?string)`                         |                                         | Serve the API on its own domain                                  |
| `middleware(array)`                       | `[]`                                    | Extra middleware, after authentication                           |
| `tenantFromToken(bool)`                   | `false`                                 | No tenant segment; the token's tenant is used                    |
| `rateLimit(int\|Closure\|null)`           | `60`                                    | Requests per minute and token                                    |
| `defaultPerPage(int)` / `maxPerPage(int)` | `15` / `100`                            | Page sizes                                                       |
| `idempotency(int, ?string)`               | a day, default cache store              | How long `store` responses are replayed, and where they are kept |
| `tokenRepository(?TokenRepository)`       | `DatabaseTokenRepository`               | Where tokens live                                                |
| `tokenExpirationOptions(array, ?int)`     | `[30, 90, 365, null]`, `90`             | Expiry choices (days) of the token form                          |
| `canManageTokens(bool\|Closure)`          | `true`                                  | Who may open the token page                                      |
| `tokensPage(string\|bool)`                | `ApiTokens`                             | The token page (`false` removes it)                              |
| `documentationPage(string\|bool)`         | `ApiDocumentation`                      | The API reference page (`false` removes it)                      |
| `canViewDocumentation(bool\|Closure)`     | `true`                                  | Who may open the API reference                                   |
| `publicDocumentation(bool)`               | `false`                                 | Serve `openapi.json` without a token                             |
| `title()` / `description()`               | "{brand} API"                           | The document's `info`                                            |
| `navigationGroup()` / `navigationSort()`  |                                         | Where the two pages appear in the navigation                     |

## Security

- The API routes live outside the panel's middleware: no session, cookie or CSRF token is involved, only the bearer token. The token's user is signed in on the panel's guard for that request only.
- Authorisation is never skipped: abilities, then the resource policy (`Resource::can()`, so `strictAuthorization()` and `$shouldSkipAuthorization` behave as in the panel). Records the user can't reach through `getEloquentQuery()` (other tenants, your own scopes) are `404`.
- Input is limited to the form's writable fields and validated by the form; output is limited to the whitelist and never contains `$hidden` attributes. Includes are whitelisted per resource and filtered by the related resource's `view` policy.
- The "Create token" form only grants abilities it offers (its checkbox lists validate their options); on tenancy panels tokens are bound to the tenant.
- New tokens travel to the page encrypted in the session and are removed as soon as the page shows them.
- Laravel's default `config/cors.php` covers `api/*`; adjust it if you change the prefix or serve browsers from other origins.

## Translations

The plugin's strings (pages, problem details, OpenAPI summaries) are in `alfakit-api::api`, in every AlfaKit locale. Publish them with `php artisan vendor:publish --tag=alfakit-api-translations`.
