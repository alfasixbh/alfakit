---
title: Forms
description: A form builder for your panel; the public fills the forms outside it, and every submission is checked on the server.
---

# Forms

`alfasix/alfakit-forms` is a form builder in the spirit of Typeform and Tally. Admins build forms in the panel with a visual builder: questions, choices, uploads, ratings, sections, page breaks for multi-step forms, and rules that show a block only when other answers match. The public fills the forms **outside the panel**, on the plugin's `/forms/{slug}` route or on any Inertia page of your app. Every submission is validated again on the server against the stored definition.

| Piece                                 | Where                | Does                                                                                      |
| ------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------- |
| `FormsPlugin`                         | A panel              | Registers the Forms resource (builder, settings, submissions, stats, export)              |
| `FormResource`                        | The panel            | List, create, edit (builder and settings) and view (stats and submissions) pages          |
| `SubmissionsRelationManager`          | The form's view page | Table of answers, a view modal, spam flags, delete, CSV and XLSX export                   |
| `FormStatsWidget`                     | The form's view page | Views, submissions (last 14 days as a sparkline), conversion and blocked spam             |
| `PublicForm`                          | Outside panels       | The form as a [standalone component](../standalone/overview), rebuilt from its definition |
| `/forms/{slug}`                       | Your app             | The public page (configurable prefix, middleware and Inertia page)                        |
| `AlfakitForms::embed()`               | Any Inertia page     | A published form as a prop for `<AlfakitComponent>`                                       |
| `FormSubmitted`, `SubmissionReceived` | Your code            | An event for every stored submission, and the queued email to the form's recipients       |

Everything is built from AlfaKit components (the `Builder` field, a `Wizard`, standard fields, `Callout`, tables, a stats widget), so it renders in React, Vue and Svelte with your themes, in right-to-left languages and on phones. There is no frontend package to install.

## Installation

```bash
composer require alfasix/alfakit-forms
php artisan vendor:publish --tag=alfakit-forms-migrations
php artisan migrate
php artisan alfakit-forms:page
```

The migration creates `alfakit_forms` (title, slug, description, the builder's `fields`, `settings`, publishing dates, limit, view count and a nullable `tenant` morph) and `alfakit_form_submissions` (form, tenant, submitter, `data`, spam flag, IP address and user agent).

`alfakit-forms:page` creates the Inertia page the public route renders, for your renderer (detected from `package.json`; pass `--adapter=react|vue|svelte`, and `--path=resources/js/Pages` if your pages live elsewhere). It is a ten-line page around `<AlfakitComponent>`; edit it freely.

Make sure your app's CSS loads the standalone styles once, as for any [standalone component](../standalone/overview):

```css
@import 'tailwindcss';
@import '@alfakit/react/standalone.css'; /* or @alfakit/vue, @alfakit/svelte */
@source '../../node_modules/@alfakit/react/dist';
```

Optionally publish the config, translations or the email view:

```bash
php artisan vendor:publish --tag=alfakit-forms-config
php artisan vendor:publish --tag=alfakit-forms-translations
php artisan vendor:publish --tag=alfakit-forms-views
```

## Register

```php
use AlfaSix\AlfakitForms\FormsPlugin;

public function panel(Panel $panel): Panel
{
    return $panel
        // ...
        ->plugin(
            FormsPlugin::make()
                ->navigationGroup('Content')
                ->navigationSort(20),
        );
}
```

| Method                                                                                                   | Default                                       | Does                                                                               |
| -------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------- |
| `resourceClass(string $class)`                                                                           | `FormResource::class`                         | Use your subclass of `FormResource`                                                |
| `label()`, `pluralLabel()`                                                                               | "Form", "Forms"                               | Model labels                                                                       |
| `navigationLabel()`, `navigationGroup()`, `navigationIcon()`, `navigationSort()`, `registerNavigation()` | "Forms", none, `clipboard-list`, none, `true` | Navigation                                                                         |
| `fieldTypes(array $types)`                                                                               | every type                                    | The blocks admins can add: `['text', 'email', 'textarea', 'select', 'page_break']` |
| `authorize(bool\|Closure $callback)`                                                                     | the policies                                  | Who may manage forms and submissions: `fn (User $user): bool => $user->is_admin`   |

Closures receive `$panel`, `$user` and `$tenant`.

## Building forms

The **Build** tab holds the title, the introduction and the builder. Each block has a question (its label), an optional **answer key**, help text, a placeholder, a _required_ switch and a width (full or half of the row, on screens wider than a phone). Blocks:

| Group           | Blocks                                                                                                         |
| --------------- | -------------------------------------------------------------------------------------------------------------- |
| Text            | Short text, long text, email, phone, website, number                                                           |
| Choices         | Dropdown (optionally several options), single choice, multiple choice, checkbox, yes / no, rating (2–10 stars) |
| Dates and files | Date (optionally with the time), file upload                                                                   |
| Layout          | Section heading (groups the fields after it), paragraph, page break                                            |

**Answer keys** are where answers are stored and exported. When left empty they are generated from the question (`Your name` → `your_name`) when the form is saved, made unique, and then kept: rewording a question later doesn't change its key, so earlier submissions still line up. Keys are lowercase letters, digits and underscores; `captcha`, `form`, `token` and `submit` are reserved.

**Validation** options depend on the block: minimum and maximum length, a **format** for short text, minimum and maximum for numbers (and whole numbers only), minimum and maximum choices, earliest and latest dates, accepted file types (images, PDF, documents) with a maximum size and number of files. Checkboxes and yes / no blocks marked required must be ticked (terms and consent).

Admins never type validation rules or regular expressions. A format is picked by name from a whitelist (letters, letters and numbers, digits, letters numbers dashes and underscores, uppercase, postal code), and the pattern behind each name is code. Add your own in a service provider:

```php
use AlfaSix\AlfakitForms\AlfakitForms;

public function boot(): void
{
    AlfakitForms::format('vat_number', '/^[A-Z]{2}[0-9A-Z]{8,12}$/', 'VAT number');
    AlfakitForms::format('iban', '/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/', 'IBAN');
}
```

**Page breaks** turn the form into a multi-step wizard: each page is a step with a progress header, the next page's title and description come from the page break, and each step is validated on the server before moving on. Name the first step in _Settings → First page title_.

### Conditional logic

Every block (and section heading) has a **Conditional logic** panel: show the block when _all_ or _any_ of its rules match. A rule picks another field, an operator and a value:

| Operator                      | Matches when the answer…                                                        |
| ----------------------------- | ------------------------------------------------------------------------------- |
| equals / does not equal       | is the value (case-insensitive; for multiple choice, one of the ticked options) |
| contains / does not contain   | contains the text                                                               |
| is answered / is not answered | has (or has no) answer                                                          |
| is greater / less than        | is a larger or smaller number or a later or earlier date                        |

Yes / no and checkbox answers compare as `yes` / `no` (or `true` / `false`, `1` / `0`). A section heading's rules hide all the fields under it, and a rule that looks at a hidden field sees it as unanswered, so chains of rules behave.

The rules run in PHP only. When an answer that a rule depends on changes, the public form asks the server for its schema again (the field is `live()`), and the server returns the fields that should show. A hidden field is neither validated nor stored, even if a browser sends a value for it.

## Settings

| Setting                         | Does                                                                                                            |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Address (`slug`)                | The public link, `/forms/{slug}`; unique                                                                        |
| Published                       | Drafts answer 404 publicly; admins can still open a signed **Preview**                                          |
| Opens at, closes at             | Before and after these times the form shows a message instead of the fields                                     |
| Submission limit                | The form closes once it has this many (non-spam) submissions; checked again inside the submit, under a row lock |
| Message when the form is closed | Shown with the closed, scheduled or full notice                                                                 |
| Submit button label             | Defaults to "Submit"                                                                                            |
| After a submission              | Show a confirmation message, or redirect to an `http(s)` URL                                                    |
| Recipients                      | Up to 20 addresses that get an email for each new submission                                                    |
| Honeypot                        | On by default                                                                                                   |
| Captcha                         | Available when the application [registers one](#captcha)                                                        |

## The public side

Published forms are served at `/forms/{slug}` by the route the plugin registers. It renders the Inertia page from `config('alfakit-forms.page')` (`alfakit-forms/form`, created by `alfakit-forms:page`) with two props:

- `form`: the `PublicForm` payload for `<AlfakitComponent>`;
- `meta`: `title`, `description`, `slug` and `preview`, for the page's `<head>`.

```php
// config/alfakit-forms.php
'route' => [
    'enabled' => true,
    'prefix' => 'forms',           // /forms/{slug}
    'middleware' => ['web'],       // your Inertia middleware runs here; add locale middleware
    'name' => 'alfakit-forms.',    // route('alfakit-forms.show', ['slug' => 'contact'])
    'domain' => null,              // e.g. 'forms.example.com'
],

'page' => 'alfakit-forms/form',
```

The page uses your app's layout, fonts and shadcn tokens. With an app-wide Inertia layout (such as a starter kit's `AppLayout`), return a minimal layout for `alfakit-forms/*` pages in `createInertiaApp({ layout })`.

### Embedding a form in any page

```php
use AlfaSix\AlfakitForms\AlfakitForms;

Route::get('/', fn () => Inertia::render('home', [
    'newsletter' => AlfakitForms::embed('newsletter'),
]));

// Pre-fill answers by their keys:
'feedback' => AlfakitForms::embed('feedback', ['email' => $request->user()?->email]),
```

```tsx
// React
import { AlfakitComponent, type StandaloneComponentSchema } from '@alfakit/react'

export default function Home({ newsletter }: { newsletter: StandaloneComponentSchema }) {
    return <AlfakitComponent component={newsletter} className="max-w-lg" />
}
```

```vue
<!-- Vue -->
<AlfakitComponent :component="newsletter" class="max-w-lg" />
```

```svelte
<!-- Svelte -->
<AlfakitComponent component={newsletter} class="max-w-lg" />
```

`embed()` takes a slug or a `Form` model, answers 404 for unknown or unpublished forms, and counts a view. Turn the plugin's route off (`'route.enabled' => false`) to serve forms only from your own routes. File downloads for admins use a route of their own under the same prefix.

### What a person sees

- The form's title and introduction, then the fields (a wizard with a step header for multi-step forms). The submit button shows on the last step.
- Fields that depend on other answers appear and disappear as they answer.
- After submitting: the confirmation message (the next visit shows the form again), or the redirect.
- Before the opening date, after the closing date or once the limit is reached: a notice with your closed message, and no fields.

Views are counted once per session (previews don't count); the conversion rate is submissions divided by views.

### Previews

The **Preview** action on the edit page opens a signed link, valid for an hour, that shows the form even as a draft, with a "Preview" notice and no submit button. Nothing can be saved from a preview: the preview flag travels in the encrypted context token and `submit()` refuses it.

## Submissions

The form's view page shows the stats and a **Submissions** table: the submission time and the first four answers as columns, search across all answers, and a _Spam_ filter (spam is hidden by default). Each row has:

- **View**: every answer in form order, file answers as download links (signed, valid for 30 minutes, and only for files that belong to that answer), plus the IP address and browser.
- **Mark as spam** / **Not spam** and **Delete** (also as bulk actions). Deleting a submission deletes its uploaded files; deleting a form deletes its submissions and files.
- **Export** in the table header: CSV and XLSX through AlfaKit's [exporter](../actions/import-export), on the queue, with one column per field of the form plus ID, submission time and spam. The download link arrives as a database notification.

Submissions can be managed by whoever may edit the form; with a policy that denies `update`, the table is read only.

To add submissions to your own resource or page, use the models:

```php
use AlfaSix\AlfakitForms\Models\Form;

$form = Form::query()->where('slug', 'contact')->firstOrFail();

$form->submissions()->where('is_spam', false)->latest()->get()
    ->map(fn ($submission) => $submission->getFormattedAnswer('email'));

$form->getStatus();          // FormStatus::Open, Draft, Scheduled, Full or Closed
$form->countSubmissions();   // non-spam
$form->getConversionRate();  // 0–100
```

### Reacting to submissions

```php
use AlfaSix\AlfakitForms\Events\FormSubmitted;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;

Event::listen(function (FormSubmitted $event): void {
    if ($event->form->slug === 'demo-request') {
        Http::post(config('services.crm.webhook'), $event->submission->data);
    }
});
```

`FormSubmitted` is dispatched after a submission is stored, never for spam.

### Email notifications

Each form's recipients get `SubmissionReceived`, a queued Laravel `Mailable` with every answer, after the submission is stored (not for spam). Choose the queue in the config, and change the email by publishing the view (`resources/views/vendor/alfakit-forms/mail/submission.blade.php`):

```php
'mail' => [
    'connection' => null, // the default queue connection
    'queue' => 'mail',
],
```

## Spam and abuse

| Protection    | How                                                                                                                                                                                           |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Honeypot      | A text input moved off screen, hidden from assistive technology (`aria-hidden`) and out of the tab order. Bots that fill it are treated as spam                                               |
| Time check    | A form submitted less than `spam.min_seconds` (2) after it was shown is spam. The time it was shown is in the encrypted context token, so it can't be faked                                   |
| Spam handling | Spam is answered exactly like a real submission (bots learn nothing), stored flagged as spam (or dropped with `spam.store => false`), and never counts toward limits, stats, events or emails |
| Rate limiting | `rate_limit.max_attempts` (5) submissions per form and IP address every `rate_limit.decay_seconds` (60); the person sees a "try again in N seconds" notification and keeps their answers      |
| Captcha       | Optional, per form, with the challenge of your choice (see below)                                                                                                                             |

```php
'spam' => [
    'honeypot_field' => '_website',
    'min_seconds' => 2,
    'store' => true,
],

'rate_limit' => [
    'max_attempts' => 5,
    'decay_seconds' => 60,
],

'store_ip_address' => true, // false: no IP address or user agent is kept
```

### Captcha

Register a captcha once, then turn it on per form (_Settings → Spam protection_). The component shows the challenge (any AlfaKit field, usually a custom field (`php artisan make:alfakit-field`) that renders the provider's widget and stores its token); `verify` checks the answer on the server:

```php
use AlfaSix\AlfakitForms\AlfakitForms;
use AlfaSix\AlfakitForms\Models\Form;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

AlfakitForms::captcha(
    component: fn (Form $form) => TurnstileField::make('captcha'), // your field
    verify: fn (mixed $value, Request $request): bool => Http::asForm()
        ->post('https://challenges.cloudflare.com/turnstile/v0/siteverify', [
            'secret' => config('services.turnstile.secret'),
            'response' => $value,
            'remoteip' => $request->ip(),
        ])
        ->json('success') === true,
);
```

The captcha goes at the end of the last page. A failed check shows the field's error and stores nothing; the captcha's value is never stored with the answers.

## File uploads

```php
'uploads' => [
    'disk' => 'local',            // private by default
    'directory' => 'alfakit-forms', // files go to {directory}/{form id}
    'max_size' => 10240,          // KB; caps what any form allows
    'max_files' => 10,
],
```

Public uploads go through AlfaKit's standalone upload endpoint (throttled, owned by the guest's session, see [standalone forms](../standalone/forms#uploads)) and are moved to the disk when the submission is stored. Only images (JPEG, PNG, GIF, WebP), PDF and office documents are accepted; SVG and HTML never are.

## Tenancy

On a panel with [tenancy](../panels/tenancy), forms belong to the current tenant through the polymorphic `tenant` relationship: the list shows the tenant's forms, new forms are created in it, and another tenant's form answers 404. Submissions copy the form's tenant. The public form is open to everyone, whatever the visitor's tenants.

## Authorisation

Without `authorize()`, the resource follows the policies of your form model (`viewAny`, `view`, `create`, `update`, `delete`), and allows everything when there is none (unless the panel uses `strictAuthorization()`). Submissions can be managed when `update` on the form is allowed.

```php
FormsPlugin::make()->authorize(fn (User $user): bool => $user->hasRole('marketing'));
```

```php
Gate::policy(\AlfaSix\AlfakitForms\Models\Form::class, FormPolicy::class);
```

## Customising

- **Models**: extend `Form` and `FormSubmission` and set `alfakit-forms.models.form` / `.submission`.
- **Resource**: extend `FormResource` (its `form()`, `table()`, `infolist()`, `getPages()`) and pass it to `resourceClass()`.
- **Public component**: `PublicForm` is a regular standalone `Form`. Extend it to change the confirmation (`content()`), the schema (`form()`) or the checks (`submit()`), and render your subclass with `YourPublicForm::for($form)`.
- **Translations**: `alfakit-forms::forms.*` in 13 languages.

## Testing

The public form is an ordinary [standalone component](../standalone/testing): read the token from the page and post to the internal endpoints.

```php
use AlfaSix\AlfakitForms\Models\Form;
use AlfaSix\AlfakitForms\Models\FormSubmission;

use function Pest\Laravel\{get, post, postJson};

it('stores a submission', function () {
    $form = Form::query()->create([
        'title' => 'Contact',
        'slug' => 'contact',
        'is_published' => true,
        'fields' => [
            ['type' => 'email', 'data' => ['label' => 'Email', 'required' => true]],
        ],
    ]);

    $inertia = ['X-Inertia' => 'true', 'X-Inertia-Version' => ''];
    $token = get('/forms/contact', $inertia)->json('props.form.token');

    postJson('/_alfakit/actions', ['token' => $token, 'action' => 'submit', 'data' => ['email' => 'nope']])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['email']);

    post('/_alfakit/actions', ['token' => $token, 'action' => 'submit', 'data' => ['email' => 'ann@example.com']], [...$inertia, 'Accept' => 'application/json'])
        ->assertRedirect();

    expect(FormSubmission::query()->sole()->data)->toBe(['email' => 'ann@example.com']);
});
```

Set `alfakit-forms.spam.min_seconds` to `0` in tests that submit right after rendering.

## Security notes

- The schema that validates a submission is rebuilt from the stored definition on every request; nothing in the request adds a field, a rule or a value for a hidden field.
- Admin input never becomes a validation rule string or a regular expression: formats are names from a whitelist, operators are a fixed list, and limits are integers.
- Redirect URLs must be `http(s)` (checked when saving and again before redirecting); `javascript:` and protocol-relative URLs are refused.
- Answers are rendered as escaped text everywhere (tables, the view modal, emails).
- File downloads need a signed, expiring URL that names the submission, the field and the file index; only files of that answer can be downloaded.
- The token carries the form by key, the preview flag and the time the form was shown, encrypted and bound to the user it was issued to (see [Security](../advanced/security)).

## "Powered by" credit

The pages and emails your customers see carry no AlfaKit or Alfa Six branding by default. To credit AlfaKit, turn on the small "Powered by AlfaKit · Alfa Six" line for public form pages (`meta.poweredBy` in the page props; pages from `alfakit-forms:page` render it) and submission emails:

```php
FormsPlugin::make()->poweredBy();
```

Without `poweredBy()`, the plugin follows `config('alfakit.credit.public_pages')` and `config('alfakit.credit.emails')`, both `false` by default. See [Credits](../panels/configuration#credits).
