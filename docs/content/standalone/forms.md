---
title: Forms outside panels
description: 'Standalone forms: fields, submit(), records, pre-filling and uploads.'
---

# Forms outside panels

```bash
php artisan make:alfakit-form ContactForm
php artisan make:alfakit-form ProfileForm --model=User   # a form that edits a record
```

A standalone form extends `AlfaSix\Alfakit\Standalone\Form`. It uses every [field](../forms/fields), [layout component](../forms/layout) and feature of panel forms: `live()` fields and `afterStateUpdated()`, searchable and relationship selects, `FileUpload`, `Repeater`, `Builder`, `RichEditor`, wizards, [field actions](../forms/field-actions) and validation rules. They all talk to the same internal endpoints as a panel form.

```php
namespace App\Alfakit\Standalone;

use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Forms\Components\Textarea;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Schemas\Components\Utilities\Get;
use AlfaSix\Alfakit\Schemas\Schema;
use App\Models\ContactRequest;

class ContactForm extends \AlfaSix\Alfakit\Standalone\Form
{
    public function form(Schema $schema): Schema
    {
        return $schema->components([
            TextInput::make('name')->required()->maxLength(120),
            TextInput::make('email')->email()->required(),
            Select::make('topic')->options(['sales' => 'Sales', 'support' => 'Support'])->required()->live(),
            TextInput::make('order_number')->visible(fn (Get $get): bool => $get('topic') === 'support')->required(),
            Textarea::make('message')->required()->rows(5)->columnSpanFull(),
        ])->columns(2);
    }

    public function submit(array $data): mixed
    {
        // $data is validated and dehydrated (uploads are stored, casts applied).
        ContactRequest::create($data);

        Notification::make()->success()->title(__('Thanks!'))->send();

        return back(); // or redirect()->route('thanks'), or nothing to redirect back
    }
}
```

A standalone form with `submit()`: fill it in and send it.

```alfakit-example name="contact-form"

```

## The submit button

The form's only button runs `submit()`. Change its label with `->submitLabel('Send')` when you build the payload, or with `getSubmitLabel()` in the class; add keyboard shortcuts with `->submitKeyBindings(['mod+s'])`. For more buttons override `getFormActions()` and keep the default one:

```php
protected function getFormActions(): array
{
    return [
        $this->getSubmitAction()->label('Save draft'),
        Action::make('preview')->color('gray')->url('/preview')->openUrlInNewTab(),
    ];
}
```

## Pre-filling

```php
ContactForm::make()->fill(['email' => $user->email, 'topic' => 'support']);
```

`fill()` merges into the form state before the page renders. Fields' `default()` values apply for everything else.

## Editing a record

Bind a model and the form fills from it, validates as an `edit` operation (`unique(ignoreRecord: true)`, `exists()`, relationship fields all work) and passes the record to actions as `$record`:

```php
namespace App\Alfakit\Standalone;

use AlfaSix\Alfakit\Forms\Components\FileUpload;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Schemas\Schema;

class ProfileForm extends \AlfaSix\Alfakit\Standalone\Form
{
    public function form(Schema $schema): Schema
    {
        return $schema->components([
            TextInput::make('name')->required(),
            TextInput::make('email')->email()->required()->unique(ignoreRecord: true),
            FileUpload::make('avatar')->image()->avatar()->directory('avatars'),
        ]);
    }

    public function submit(array $data): mixed
    {
        $this->getRecord()->update($data);

        Notification::make()->success()->title(__('Profile saved'))->send();

        return back();
    }
}
```

```php
// In the controller:
'profile' => ProfileForm::make(['record' => $request->user()]),
// or
'profile' => ProfileForm::make()->record($request->user()),
```

The record travels in the context token by route key and is resolved again on every internal request (404 when it no longer exists), never serialised.

### Relationship fields

Relationship fields (`Select::make('tags')->relationship()->multiple()`, `CheckboxList`, `Repeater::relationship()`) are saved after `submit()`. On an edit form they are saved to the bound record. On a create form, give the schema the model so the fields can find their relationship, and return the record you created:

```php
public function form(Schema $schema): Schema
{
    return $schema->model(Post::class)->components([
        TextInput::make('title')->required(),
        Select::make('tags')->relationship('tags', 'name')->multiple(),
    ]);
}

public function submit(array $data): mixed
{
    return Post::create($data); // tags are saved to this post, then the page redirects back
}
```

`$data` never contains the relationship fields, so `create($data)` and `update($data)` only receive real columns.

## Uploads

`FileUpload` works for guests too: files go to the temporary disk through `/_alfakit/uploads` (throttled, owned by the guest session) and are moved to their disk and directory when `submit()` receives the validated data.

```php
// config/alfakit.php
'standalone' => [
    'guard' => env('ALFAKIT_STANDALONE_GUARD', 'web'), // the guard tokens and uploads are bound to
    'guest_uploads' => true,                          // false: uploads require a user on that guard (401 otherwise)
],
```

With `guest_uploads` on, the upload endpoint is throttled (60 per minute) and a guest can only use, preview or delete the files of their own session; the field's `acceptedFileTypes()`, `maxSize()` and the global upload rules still apply.

## Tenants

`->tenant($team)` (or `make(['tenant' => $team])`) scopes the component to a tenant. The tenant travels in the context token by key and membership is re-checked on every internal request: the user of the standalone guard must implement `HasTenants` and `canAccessTenant()` must return true, or the request is refused with 404. Guests fail closed. Override `canAccessTenant(Model $tenant): bool` on the component when membership is established another way (e.g. a public form scoped to a shop by its URL).

## Authentication and authorisation

Standalone components are available to guests by default. Override `requiresAuthentication()` to require a signed-in user on the component's guard (`alfakit.standalone.guard`), and `authorize()` for a check that sees the resolved parameters and record:

```php
public static function requiresAuthentication(): bool
{
    return true;
}

public function authorize(): bool
{
    return $this->getRecord()?->user_id === auth()->id();
}
```

Both run when the payload is built (403 on the page) and again on every internal request, so a token cannot outlive a permission.

## After submit

`submit()` may return any response. Returning nothing, or the record it created, redirects back to the page, like an action. Validation errors from `validate()` or a thrown `ValidationException` are shown under the fields. Notifications sent during `submit()` are flashed and shown as toasts by `<AlfakitToaster>` (see [Widgets and notifications](widgets-and-notifications)).

### Resetting the form

After a successful submit the page renders again and the form refills from what the page passes (`fill()` data, the bound record, defaults). To show an empty form instead, call `reset()` in `submit()`, or opt in for every submit with `resetAfterSubmit()`:

```php
public function submit(array $data): mixed
{
    ContactRequest::create($data);

    $this->reset();                        // defaults only
    // $this->reset(['topic' => 'sales']); // defaults plus these values

    return back();
}

// Or when building the prop (the option travels in the context token):
'contact' => ContactForm::make()->fill(['email' => $user->email])->resetAfterSubmit(),
```

The render after the reset fills the form with the fields' defaults plus the data passed to `reset()`, ignoring `fill()` data and the bound record; later renders fill it as usual. Failed validation never resets. Set `protected bool $shouldResetAfterSubmit = true;` in the class to make it the default.
