---
title: Security
description: What AlfaKit enforces on the server, and what you need to know when you write custom fields, actions and pages.
---

# Security

Everything the browser sends is untrusted. AlfaKit validates, authorises and scopes on the server; the renderers only display what PHP sent them.

## Internal endpoints

Actions, schema refreshes, select search, inline edits, reordering, column order and uploads go to `/_alfakit/*`. Each page carries an encrypted context token naming the panel, page, route parameters and the user it was issued to. On every request Alfakit:

- rejects tokens issued to another user (403) or older than `alfakit.token_lifetime` minutes (419, default 1440; set `ALFAKIT_TOKEN_LIFETIME=0` to never expire);
- re-runs the panel's auth middleware (email verification, your own `authMiddleware()`), `canAccessPanel()` and the page's `canAccess()`;
- restores the tenant from the token, re-checks membership and runs the tenant middleware. The URL of the internal endpoint is never trusted for the tenant.

When a token or the CSRF token has expired, the renderers reload the page to get fresh ones.

## Exposed page methods

Custom page components call page methods through `POST /_alfakit/pages/call` (see [app pages](/docs/pages/app-pages)). The endpoint uses the same context token checks as the other internal endpoints, and also:

- only runs public, non-static methods marked `#[Expose]`; anything else answers 404, including `mount()`, `render()`, `getViewData()` and the `{name}Form()` definitions;
- refuses a token used under another tenant's URL (404), so a call always runs for the tenant of the page it came from;
- checks `#[Expose(authorize: ...)]` with the Gate for the panel user, and `rateLimit` per user (or IP address) and method;
- validates arguments with the attribute's `rules`; with rules, arguments without a rule are dropped. Scalar, enum and `TemporaryUpload` parameters are cast or refused (422); class-typed parameters come from the container and can't be filled from the browser. A `TemporaryUpload` is only found for the user who uploaded it;
- validates named forms sent with the call through their PHP schema (`$this->formState('sale')`), with the same hidden, read-only and disabled field rules as action forms.

What it can't do for you: an exposed method is not a resource query, so **scope every query to `alfakit()->getTenant()`** and authorise per record (`Gate::authorize('update', $order)`) inside the method. Treat every argument as untrusted, as you would in a controller.

## Form state

- **Hidden fields** — directly or through a hidden section, tab, step or group — are not validated, not saved, and their values are not sent to the browser. Values posted for them are ignored and the server value is kept. Use `dehydratedWhenHidden()` to save a hidden field's server value.
- **Read-only fields** (`readOnly()`, including every field inside a read-only Repeater) keep their server value: values posted for them are ignored, and the server value is validated and saved. Values the server writes into a read-only field with `$set()` during a live update (a slug derived from the title, a line total) travel back to the browser encrypted and survive the next request. Read-only fields inside the items of an editable repeater are enforced for existing relationship items (matched by key); plain repeater items have no stable identity, so validate those fields with rules.
- **Disabled fields** keep their server value and aren't saved. Call `dehydrated()` explicitly to save a disabled field (its posted value is then validated).
- **Relationship selects and checkbox lists** validate submitted keys against the same query that lists the options, including `modifyQueryUsing` constraints and the current tenant.
- **Field actions** (`prefixActions()`, `suffixActions()`, `hintActions()`, a select's create and edit option buttons, rich editor custom blocks) only run for fields that are visible for the submitted state and not disabled, and only actions the field defines. Creating a select option needs the related model's `create` ability; editing one needs `update` on a record found through the select's own (tenant-scoped) query.
- **Relationship layout components** (`Section::make()->relationship()`) save the related record only when visible and enabled; new related records are owned by the current tenant.
- **[ModalTableSelect](/docs/forms/modal-table-select)** lists records through the select options endpoint (so it is authorised from the context token like every field request, and refuses hidden, disabled and read-only fields), always from the tenant-scoped relationship or table query. Submitted keys are validated against that same query, so records the picker can't list can't be selected.
- **[Builder](/docs/forms/builder)** items are validated on the server: each item's `type` must be one of the visible blocks (or a block the record already held), each block's `maxItems()` and the builder's `minItems()`/`maxItems()`, `addable(false)` and `deletable(false)` are enforced, and every block field runs its own rules.
- **[ToggleButtons and Slider](/docs/forms/choice-and-input-fields)** accept only their enabled options and values within `minValue()`–`maxValue()`.
- `unique()` and `exists()` on a tenant-owned table add the tenant column automatically.

## Table state

Sort, search, filters, grouping and pagination come from the query string and are treated as user input:

- Sorting and grouping only use columns and groups the table defines; anything else falls back to the default.
- The [query builder](/docs/tables/filters#query-builder) only accepts its own constraints and operators, validates every value (numbers, `Y-m-d` dates, text up to 255 characters, option values of select constraints) and limits nesting (`maxDepth()`) and rule count (`maxRules()`). Invalid rules are ignored. Relationship constraint options, and the labels in their indicators, come from the related model scoped to the current tenant.
- State persisted with `persistFiltersInSession()` and friends is stored per panel, tenant, user and table, and is applied through the same filters as the query string.

## Uploads

- Temporary files are named with a ULID and an extension derived from the detected MIME type, never from the client's file name. Keys that don't match that format are rejected, so a value can't point outside the temporary directory.
- Detected types in `alfakit.uploads.blocked_mime_types` (HTML, SVG, JavaScript, PHP, executables, XML by default) are refused, because browsers would run them when served from your domain.
- Each upload belongs to the user (or guest session) who made it; nobody else can attach or delete it.
- `acceptedFileTypes()`, `image()`, `minSize()` and `maxSize()` are enforced on the server when the form is submitted.
- A FileUpload only accepts stored paths it was filled with (or that the record holds), so a user can't point a record at someone else's file.

## Imports and exports

- Import files arrive through the upload endpoint like any upload; only the uploader can import them, and only headers of that file can be mapped. Every row is validated on the server.
- Import and export jobs restore the tenant of the request that started them. Imported records join that tenant, relationship columns only find the tenant's records, and existing records outside the tenant or not updatable by the user (policy `update`) fail the row.
- Exports read only the record keys the table's authorised, tenant-scoped query returned when the user started them.
- Export files, failed rows and example CSVs are served through signed, expiring links, behind the panel's auth middleware, and only to the user who started the run. Keep `alfakit.import_export.export_disk` private.
- CSV cells that a spreadsheet would run as a formula (`=`, `+`, `-`, `@`, tab, carriage return) are prefixed with `'`.

See [Import & export](/docs/actions/import-export).

## HTML output

The rule: **markup written in code is trusted, state is not.** An `Htmlable` you build (`new HtmlString(...)`, `view(...)`, `str($markdown)->markdown()->toHtmlString()`, a slot's Blade view) is sent as-is. Strings that come from records or requests are escaped, or sanitised where a component renders them as HTML.

- Notification bodies, modal descriptions, helper text, hints, placeholder content and the descriptions of `Callout` and `EmptyState` escape plain strings.
- `->html()` on `TextColumn` and `TextEntry` sanitises string state on the server. An `Htmlable` returned from `formatStateUsing()` or `state()` is trusted. `->html(sanitize: false)` turns sanitising off; use it only for content no user can write.
- `->markdown()` escapes raw HTML, removes unsafe links and sanitises the result.
- The `Html` component sanitises plain strings and trusts `Htmlable` content. `->sanitize()` forces sanitising, `->sanitize(false)` turns it off.
- `RichContentRenderer` sanitises stored HTML before it inserts merge tags and custom blocks, because a crafted request can store any HTML in the field. JSON documents are rebuilt from known nodes with every text and attribute escaped. `->sanitize(false)` turns it off for trusted content. Custom block configurations come from the browser, so escape them in `toPreviewHtml()` and `toHtml()`.

The sanitiser is [Symfony HtmlSanitizer](https://symfony.com/doc/current/html_sanitizer.html). It keeps text formatting, headings, paragraphs, lists, quotes, code blocks, tables, `details`, links (`http`, `https`, `mailto`, `tel`, relative; `rel="noopener noreferrer nofollow"` is added), images (`http`, `https`, relative and `data:image/*`) and the rich editor's mention, merge tag and custom block markers, text colours, highlights, sub/superscript and alignment. It removes scripts, styles, iframes, forms, event handlers, `id` attributes, `style` declarations other than `color`, `background-color` and `text-align` with plain values (no `url()`, `var()` or positioning), and `class` names other than `alfakit-*` and `language-*`, so content can't reuse the panel's utility classes to overlay the page. Sanitise anything else yourself with `AlfaSix\Alfakit\Support\Html::sanitize($html)`.

Change what is allowed per panel. The closure receives the default config:

```php
use Symfony\Component\HtmlSanitizer\HtmlSanitizerConfig;

$panel->htmlSanitizer(fn (HtmlSanitizerConfig $config) => $config
    ->allowElement('iframe', ['src', 'allowfullscreen'])
    ->allowMediaHosts(['www.youtube.com']));
```

## URLs

`url()` on columns, entries, actions, navigation items, user menu items, notification actions and stats only keeps `http`, `https`, `mailto`, `tel`, relative paths and `#fragments`. Other schemes (`javascript:`, `data:`, `vbscript:`, `file:`), including spellings browsers still run (mixed case, tabs or entities inside the scheme), are dropped, and the component renders without a link. Use `AlfaSix\Alfakit\Support\Url::sanitize($url)` (null when unsafe) for URLs you output yourself.

## CSS colours

`ColorColumn` and `ColorEntry` only send plain CSS colours to the browser: hex, `rgb()`, `hsl()`, `hwb()`, `lab()`, `lch()`, `oklab()` and `oklch()` with numeric arguments, and colour keywords. Anything else (`url()`, `var()`, `expression()`, extra declarations such as `red; background: url(…)`) becomes null and the placeholder shows. Use `Str::sanitizeCssColor($color)` (or `str($color)->sanitizeCssColor()`) for colours you put in styles yourself; it returns null (an empty string from the fluent version) when the value isn't a plain colour. The same macros exist for HTML and URLs: `Str::sanitizeHtml()` / `str($html)->sanitizeHtml()` and `Str::sanitizeUrl()` / `str($url)->sanitizeUrl()` (pass an allowlist of schemes as the second argument, as in Filament: `Str::sanitizeUrl($url, ['https'])`). `FileUpload` (and the media library field) run every file URL they send to the browser (preview, open and download links) through it.

## Icons

Icons may be image URLs or inline SVG ([Icons](../design/icons#image-and-svg-icons)). SVG markup, whether from an `HtmlString`, a plain string or a registered icon set, is sanitised on the server: only drawing elements and presentation attributes are kept, and scripts, event handlers, `foreignObject`, `<style>`, external `href`s and `url()`s that leave the icon are removed. Icon URLs are only drawn as `<img>` and must be `http(s)`, protocol-relative, root-relative or `data:image/…`. Icon set names can't contain path separators, so `Icons::registerSet('app', resource_path('svg'))` never reads outside that directory.

## Sign-in and accounts

- With [multi-factor authentication](/docs/panels/multi-factor-authentication), a correct password only marks the user as pending in the session; they are signed in (and the session regenerated) after a valid code. Wrong codes are rate limited, app codes can't be replayed, and recovery codes are stored hashed and work once: a code is checked and spent under a per-user lock, in a transaction that re-reads the user row, so two concurrent requests can't both use it. App secrets are stored encrypted. Trusted-device cookies are encrypted, HTTP-only and tied to the user's password and second factors. With required MFA, users without a second factor can only use the profile page and its internal endpoints.
- With `emailChangeVerification()`, a new email address is only applied from the signed link sent to it, and the old address can cancel the change.
- [Impersonation](/docs/panels/impersonation) needs `CanImpersonate` on the impersonator and is checked against `CanBeImpersonated`, panel access and the `impersonate` policy ability on the server; the real user is remembered in the session only.

## Tenancy

The tenant comes from the route (path or [tenant domain](/docs/panels/tenancy#subdomains-and-custom-domains)) for pages and from the context token for internal requests, and membership is checked on every request. Standalone components with `->tenant()` re-check membership the same way (`canAccessTenant()`, 404 otherwise; guests fail closed). Database notifications are listed and cleared per tenant, `tenantUploadDirectory()` keeps each tenant's files apart, and `requiresTenantSubscription()` applies the billing middleware to internal requests too.

## Authorization

See [Authorization](/docs/resources/authorization). In short: list pages need `viewAny`, inline cell edits and reordering need `update` on each record, actions in hidden groups or sections can't be run, and relation managers are read-only on View pages and when the user can't update the owner record.

- **Bulk actions** only receive records from the table's own query (tenant, relation manager and list-tab scope included); posted keys outside it are ignored. `authorizeIndividualRecords()` checks a policy for each record, and the prebuilt delete, restore and force-delete bulk actions do so by default.
- **Nested modal actions** (`parent>child`) are resolved through their parent: a child of a hidden or unauthorised action can't be opened or run, and it works on the parent's record or selection.
- **Nested resources** resolve their parent record through the parent resource's query and require `view` or `update` on it; their own queries are scoped to that parent, so records of another parent are not found.
- **[API resources](/docs/resources/api-resources)** have no query to scope: record keys posted by the renderer (actions, bulk actions, record pages) are resolved again through the data source's `find()`, and the current tenant and owner record are handed to every call, so the data source must scope `records()`, `find()` and the writes to them. Every `can*()` check (or the resource's `$policy`) still runs. Failures from the API reach the user as a generic error notification; response bodies are never shown (422 field errors excepted).
- **List tabs** only accept the keys returned by `getTabs()`; anything else in `?activeTab=` falls back to the default tab.

## Content Security Policy

AlfaKit works with a nonce-based Content Security Policy. Generate the nonce with Laravel's `Vite::useCspNonce()` in a middleware that runs before the response renders (or a package such as `spatie/laravel-csp` that sets it), and send a policy that allows it:

```php
// app/Http/Middleware/ContentSecurityPolicy.php
public function handle(Request $request, Closure $next): Response
{
    Vite::useCspNonce();

    $response = $next($request);
    $nonce = Vite::cspNonce();

    $response->headers->set('Content-Security-Policy', implode('; ', [
        "default-src 'self'",
        "script-src 'self' 'nonce-{$nonce}'",
        "style-src 'self' 'nonce-{$nonce}' https://fonts.bunny.net",
        "style-src-attr 'unsafe-inline'",
        "font-src 'self' https://fonts.bunny.net",
        "img-src 'self' data: https:",
        "connect-src 'self'",
    ]));

    return $response;
}
```

What carries the nonce:

- The root view's inline theme `<script>` and `<style>` tags, the custom colour `<style>`, and the Vite tags.
- Plugin assets from `Assets::register()`: `<link>` and `<script>` tags, the CSS variables `<style>`, the script data `<script>`, and inline scripts from `Js::make()->html()` (`<script>` tags without a nonce get it).
- `Slot::HEAD_START` / `HEAD_END` content: `<script>` and `<style>` tags without a nonce get it, and closures receive it as `$nonce` (and `$data['nonce']`).
- Styles added in the browser: Inertia's progress bar and the rich editor's base CSS take the page's nonce (read from the tags above). Toast styles ship in the renderer's stylesheet; in React, Sonner also injects a copy at load, which the policy blocks with a harmless console message.

Allow for these as well:

- `style-src-attr 'unsafe-inline'`: the root `<html>` carries the panel's theme variables in a `style` attribute, and components set widths and colours with inline styles.
- The font host when you use one: `fonts.bunny.net` (the default) or `fonts.googleapis.com` and `fonts.gstatic.com` for `FontProvider::Google`. With `font(..., url:)` or `FontProvider::None` only your own origin is needed.
- `img-src` for avatar providers (`ui-avatars.com` with `UiAvatarsProvider`), icon URLs and uploads on another disk; `connect-src` for realtime notifications (your Reverb or Pusher host) and the Vite dev server in local development (`http://localhost:5173` and `ws://localhost:5173`).
- Server-rendered HTML that reaches the page through `dangerouslySetInnerHTML` (slot HTML, `Html` components, rich content) is sanitised but inserted after load, so inline `<script>` in it never runs; put scripts in head slots or assets instead.

- The [debug panel](debug-panel) prop (`alfakitDebug`: schema tree, evaluated closures, timings) and the `Server-Timing` header are only added while `app.debug` is on and the panel enables the debug panel (`debugPanel()`, on by default in `local`). With `app.debug` off they are never sent, whatever the panel configuration. In tests, the `X-Alfakit-Debug` request header returns the prop only while `app()->runningUnitTests()` is true.

## Sensitive actions

- `requiresPasswordConfirmation()` verifies the current password through the panel's guard before the action runs; wrong passwords are throttled (five per minute per user and IP), and a confirmation is remembered in the session only for `auth.password_timeout` (or the minutes you set).
- `rateLimit()` counts runs per user (or IP for guests), panel, page and action. Missing policy methods allow by default; `->strictAuthorization()` on the panel makes them deny. Record sub-navigation only links to record pages the user may open (`update` for edit pages, `view` for view pages), and those pages check the ability again when opened.
