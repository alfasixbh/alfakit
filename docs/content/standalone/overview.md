---
title: Outside panels
description: Use AlfaKit forms, tables, infolists, actions and widgets in your own Inertia pages, with your own routes, layout and styling.
---

# AlfaKit outside panels

Panels are great for admin areas. The rest of your application has its own routes, layouts and design, and that is exactly where you still want a validated form, a sortable table or a stats row without rebuilding them in JavaScript. **Standalone components** are AlfaKit forms, tables, infolists, actions and widgets that you render in any Inertia page of your application, with no panel, no `createAlfakit()` and no panel layout.

Everything you know from panels works the same way: the component is defined in PHP, the renderer only displays it, and validation, authorisation, queries, uploads, notifications, live fields, select search, inline edits, reordering, lazy loading and polling all run through the same internal endpoints as a panel page.

## When to use it

- A **contact, feedback or application form** on a public page, with server-side validation and a toast when it is sent.
- A **customer-facing table** (orders, invoices, team members) in your app's own layout, with search, sorting, filters, record and bulk actions.
- A **detail view** (`Infolist`) with a couple of actions next to it.
- A **stats or chart row** on an app dashboard that is not an admin dashboard.
- Any mix of those as one **component** (a headless page): form plus table, infolist plus widgets.

Use a [panel](../panels/configuration) when you want navigation, resources with CRUD pages, authentication pages and a complete admin layout.

## Five-minute example

Install the styles once (or run `php artisan alfakit:install --standalone` in an app without a panel, which does these steps and creates this example):

```css
/* resources/css/app.css */
@import 'tailwindcss';
@import '@alfakit/react/standalone.css'; /* or @alfakit/vue, @alfakit/svelte */
@source '../../node_modules/@alfakit/react/dist';
```

Generate a form:

```bash
php artisan make:alfakit-form ContactForm
```

```php
namespace App\Alfakit\Standalone;

use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Forms\Components\Textarea;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Standalone\Form;
use Illuminate\Support\Facades\Mail;

class ContactForm extends Form
{
    public function form(Schema $schema): Schema
    {
        return $schema->components([
            TextInput::make('email')->email()->required(),
            Textarea::make('message')->required()->minLength(10),
        ]);
    }

    public function submit(array $data): mixed
    {
        Mail::raw($data['message'], fn ($mail) => $mail
            ->to('support@example.com')
            ->replyTo($data['email'])
            ->subject('Contact form'));

        Notification::make()->success()->title(__('Thanks, we will reply soon.'))->send();

        return back();
    }
}
```

Pass it to any Inertia page as a prop:

```php
Route::get('/contact', fn () => Inertia::render('contact', [
    'form' => ContactForm::make()->fill(['email' => request()->user()?->email]),
]));
```

Render it with the drop-in component of your renderer:

```tsx
// React — resources/js/pages/contact.tsx
import { AlfakitComponent, type StandaloneComponentSchema } from '@alfakit/react'

export default function Contact({ form }: { form: StandaloneComponentSchema }) {
    return <AlfakitComponent component={form} className="max-w-xl" />
}
```

```vue
<!-- Vue -->
<AlfakitComponent :component="form" class="max-w-xl" />
```

```svelte
<!-- Svelte -->
<AlfakitComponent component={form} class="max-w-xl" />
```

That is all. The page keeps your layout; the form uses your app's shadcn tokens; submitting posts to `/_alfakit/actions`, validates on the server, shows the errors under the fields, runs `submit()` and shows the notification as a toast.

## What the payload carries

`ContactForm::make()` is JSON-serialisable (it also implements `Arrayable` and `JsonSerializable`, so `json_encode()` and API responses work). The payload holds the content blocks (form, table, infolist, widgets, schema content), the header actions, an encrypted context token, the internal endpoint URLs, the translations of the current language, and the localization (language, direction, currency, timezone). The renderer needs nothing else: no shared `alfakit` prop, no panel.

## The hidden standalone panel

Internal requests of standalone components are served by a hidden panel with the id `standalone`. It registers only the internal endpoints (`/_alfakit/actions`, `/_alfakit/schema/*`, `/_alfakit/table/*`, `/_alfakit/uploads`, `/_alfakit/standalone/components`) and no pages, navigation or auth routes. Configure it in `config/alfakit.php`:

```php
'standalone' => [
    'enabled' => true,
    'path' => '',                 // '/{path}/_alfakit/*'; set one if a panel lives at the root
    'middleware' => ['web'],      // add your locale middleware here
    'auth_middleware' => [],      // extra middleware for components that require authentication
    'guard' => env('ALFAKIT_STANDALONE_GUARD', 'web'),
    'guest_uploads' => true,      // uploads from guests (throttled); false requires the guard
    'plugins' => [],              // plugins whose widgets you use outside panels (CalendarPlugin::class…)
],
```

The [security guarantees](../advanced/security) of panels apply unchanged: tokens are bound to the user they were issued to and expire; hidden, disabled and read-only fields keep their server values; uploads go through `TemporaryUpload` and belong to the user or guest session that made them; `make()` parameters (models by route key) are re-resolved on every request, and a component's `requiresAuthentication()`, `canAccess()` and `authorize()` are re-checked on every internal request.

## Next

- [Component kit](component-kit): `Alfakit::render()`, `make:alfakit-page --standalone`, charts, Kanban boards and calendars outside panels.
- [App auth kit](auth-kit): sign-in, registration, two-step verification and an account page for your app's users.
- [Forms](forms): `submit()`, records, `fill()`, uploads.
- [Tables](tables): parameters, query string state, actions.
- [Actions and infolists](actions-and-infolists): buttons with modals, detail views, headless components.
- [Widgets and notifications](widgets-and-notifications): stats, charts, polling, toasts.
- [Customizing](customizing): registry overrides, classes, layout, slots.
- [Testing](testing): Pest tests for standalone components.
