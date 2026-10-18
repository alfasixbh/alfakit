---
title: Emails
description: AlfaKit's branded email theme, right to left and dark mode, the mail preview page and editable templates.
---

# Emails

Every email AlfaKit and its plugins send uses one theme built from your panel's brand: the logo, the brand name, the primary colour and the font. It follows the recipient's language (right to left for Arabic, Persian, Hebrew…), has a dark variant, and is built from tables with inline styles so it survives Gmail, Outlook and Apple Mail.

| Email                                 | Key                           | Sent by                                                |
| ------------------------------------- | ----------------------------- | ------------------------------------------------------ |
| Sign-in code                          | `alfakit.multi-factor-code`   | Email multi-factor authentication                      |
| Confirm a new email address           | `alfakit.email-change-verify` | `emailChangeVerification()`                            |
| Email change requested                | `alfakit.email-change-notice` | `emailChangeVerification()`, to the old address        |
| Password reset                        | `alfakit.password-reset`      | `passwordReset()`                                      |
| Email address verification            | `alfakit.email-verification`  | `emailVerification()` (Laravel's `VerifyEmail`)        |
| User invitation                       | `alfakit.users-invitation`    | The users resource of `alfakit:users`                  |
| Team invitation                       | `teams.invitation`            | [Teams](/docs/plugins/teams)                           |
| Request received, agent reply, solved | `helpdesk.*`                  | [Helpdesk](/docs/plugins/helpdesk)                     |
| New ticket or reply (to agents)       | `helpdesk.agent-notification` | [Helpdesk](/docs/plugins/helpdesk)                     |
| Invoice, quote or receipt             | `invoices.document`           | [Invoices](/docs/plugins/invoices)                     |
| New form submission                   | `forms.submission`            | [Forms](/docs/plugins/forms)                           |
| Workflow notification                 | `workflows.notification`      | [Workflows](/docs/plugins/workflows)                   |
| Webhook endpoint disabled             | `webhooks.endpoint-disabled`  | [Webhooks](/docs/plugins/webhooks) (`mailOnDisable()`) |

## The theme

Nothing to set up: the theme reads the default panel. Emails sent from a queue have no current panel, so they use the default panel too; point them at another one with `alfakit.mail.panel`.

```php
// config/alfakit.php
'mail' => [
    'theme' => env('ALFAKIT_MAIL_THEME', true), // false: your application's mail theme
    'verify_email' => true,       // theme Laravel's "verify your email address" mail too
    'panel' => null,              // the panel id whose brand emails use
    'name' => null,               // brand name (default: the panel's brandName())
    'logo' => null,               // absolute URL or path of a PNG logo
    'dark_logo' => null,          // logo for dark mode
    'logo_height' => 32,          // pixels
    'primary_color' => null,      // any CSS colour (default: the panel's primary colour)
    'font' => null,               // font family (default: the panel's font)
    'url' => null,                // where the logo links to (default: the panel URL)
],
```

- **Logo.** Most email clients don't show SVG images, so an SVG panel logo is skipped and the brand name shows instead. Give a PNG with `alfakit.mail.logo` (and `dark_logo` for dark backgrounds).
- **Colours.** Buttons, links, the top border and panels use the primary colour; the button text is white or near black, whichever reads better (WCAG AA). In dark mode, links switch to a lighter shade of the same hue when the primary colour is too dark.
- **Fonts.** The panel font comes first, followed by system fonts and Tahoma / Segoe UI, which cover Arabic and Persian.
- **Direction.** `lang` and `dir` come from the locale the email is rendered in. Laravel renders notifications in the notifiable's `preferredLocale()` (`HasLocalePreference`) and mailables in their `->locale()`, so an Arabic-speaking user gets `dir="rtl"` with right-aligned text.
- **Dark mode.** `color-scheme` meta tags and a `prefers-color-scheme: dark` stylesheet (Apple Mail, iOS, Outlook apps and others) recolour the background, text, links and logo; clients that don't support it show the light version.
- **Accessibility.** Layout tables have `role="presentation"`, the document has a `<title>`, `lang` and `dir`, and text meets WCAG AA contrast in both modes.

The CSS is inlined with Laravel's CSS inliner (`tijsverkoyen/css-to-inline-styles`, which ships with Laravel). The "Powered by AlfaKit · Alfa Six" line appears at the end only when you turn it on (`alfakit.credit.emails`, or a plugin's `->poweredBy()`).

### Your own emails in the theme

Notifications: return `AlfaSix\Alfakit\Mail\MailMessage` instead of Laravel's `MailMessage`. Lines, actions, greetings and `markdown()` views work as usual.

```php
use AlfaSix\Alfakit\Mail\MailMessage;

public function toMail(object $notifiable): MailMessage
{
    return (new MailMessage)
        ->subject('Your export is ready')
        ->line('Download it within 24 hours.')
        ->action('Download', $this->url);
}
```

Mailables with a Markdown view: add the `UsesAlfakitMailTheme` trait. The view keeps using `<x-mail::message>`, `<x-mail::button>`, `<x-mail::panel>`, `<x-mail::table>` and `<x-mail::subcopy>`.

```php
use AlfaSix\Alfakit\Mail\Concerns\UsesAlfakitMailTheme;

class OrderShipped extends Mailable
{
    use UsesAlfakitMailTheme;

    public function content(): Content
    {
        return new Content(markdown: 'mail.orders.shipped');
    }
}
```

Your application's other Markdown emails keep Laravel's theme. To render any Markdown view in the theme yourself, call `MailTheme::render('mail.orders.shipped', $data)` (HTML) or `MailTheme::renderText(...)`.

### Changing the layout

Publish the views and edit them; published components win over AlfaKit's, and components AlfaKit doesn't override (`promotion`, the plain-text ones) fall back to Laravel's.

```bash
php artisan vendor:publish --tag=alfakit-mail
```

They land in `resources/views/vendor/alfakit/mail`: `html/layout.blade.php` (document, dark styles), `html/header.blade.php` (logo), `html/message.blade.php`, `html/button.blade.php`… and `theme.blade.php`, the CSS that is inlined. To change the brand without touching views, replace its resolution:

```php
use AlfaSix\Alfakit\Mail\MailBrand;
use AlfaSix\Alfakit\Mail\MailTheme;

MailTheme::brandUsing(fn (?Panel $panel): MailBrand => new MailBrand(
    name: 'Acme',
    logo: 'https://cdn.acme.test/mail-logo.png',
    primary: '#0f766e',
));
```

## Mail preview page

`MailPreview` lists every registered email and renders the one you pick four times, with sample data: light and dark, left to right and right to left (the panel's first right-to-left locale, else Arabic). The previews are sandboxed frames: no scripts run and nothing is sent or saved.

```php
use AlfaSix\Alfakit\Pages\MailPreview;

$panel->pages([MailPreview::class]);
```

Anyone signed in may open it while the application runs locally or with `APP_DEBUG` on. Otherwise only users the `viewAlfakitMailPreview` gate allows may, or decide yourself:

```php
Gate::define('viewAlfakitMailPreview', fn (User $user): bool => $user->is_admin);

// or
MailPreview::authorize(fn (User $user): bool => $user->is_admin);
```

### Registering your emails

Register your emails in a service provider's `boot()` to preview them (and, with `editable()`, let admins edit them). Build the sample from unsaved models: previews never send mail or write to the database.

```php
use AlfaSix\Alfakit\Mail\MailDefinition;
use AlfaSix\Alfakit\Mail\Mails;

Mails::register(
    MailDefinition::make('orders.shipped')
        ->label(fn () => __('Order shipped'))
        ->group(fn () => __('Orders'))
        ->preview(fn () => new OrderShipped(Order::factory()->make(['number' => 'A-1042']))),
);
```

`preview()` returns a mailable, a notification (rendered for `preview@example.com`, or return `[$notification, $notifiable]`) or a `MailMessage`.

## Editable templates

With the [Mail templates plugin](/docs/plugins/mail-templates), admins edit the subject and body of an email per language in the panel: merge tags from the editor's toolbar, a preview with sample data, a test email to themselves, "Reset to default" and the version history. Without the plugin, nothing changes: emails send their own content.

An email opts in with the `UsesEditableTemplate` trait: it names its template and hands over the merge tag values. It keeps its own content until an admin edits the template for the language it is sent in.

```php
use AlfaSix\Alfakit\Mail\Concerns\UsesAlfakitMailTheme;
use AlfaSix\Alfakit\Mail\Concerns\UsesEditableTemplate;
use AlfaSix\Alfakit\Mail\EditableTemplates;

class OrderShipped extends Mailable
{
    use UsesAlfakitMailTheme;
    use UsesEditableTemplate;

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->templateSubject(__('Order :number is on its way', ['number' => $this->order->number])));
    }

    public function content(): Content
    {
        return $this->templateContent(new Content(markdown: 'mail.orders.shipped'));
    }

    public function templateKey(): string
    {
        return 'orders.shipped';
    }

    public function templateData(): array
    {
        return [
            'name' => $this->order->customer_name,
            'number' => $this->order->number,
            'button' => EditableTemplates::button($this->order->trackingUrl(), __('Track your order')),
        ];
    }
}
```

Notifications wrap their message instead: `return $this->templateMailMessage((new MailMessage)->...);`.

Then declare which merge tags admins may use, and the default subject and body the editor starts from:

```php
Mails::register(
    MailDefinition::make('orders.shipped')
        ->label(fn () => __('Order shipped'))
        ->preview(fn () => new OrderShipped(Order::factory()->make()))
        ->editable(
            mergeTags: ['name' => 'Customer name', 'number' => 'Order number', 'button' => 'Tracking button'],
            subject: 'Order {{ number }} is on its way',
            body: fn () => MailDefinition::paragraphs('Hi {{ name }},', 'Your order {{ number }} has shipped.', '{{ button }}'),
        ),
);
```

- **Merge tags** are `{{ id }}` in subjects and RichEditor merge tags in bodies. Values are escaped; `Htmlable` values are inserted as they are, which is how `EditableTemplates::button($url, $label)` adds a themed button and `EditableTemplates::link($url)` a link. Saving a template with a tag the email doesn't offer fails validation.
- **Languages.** A template is used only for the language it is written in (`pt_BR` also matches a `pt` template); other languages keep the email's own translated content.
- **Subject only.** An edited subject without a body changes the subject and keeps the content.
- **Sanitising.** Bodies are sanitised with the panel's HTML sanitiser when saved and again when sent.
- **Powered by.** Edited templates also end with the "Powered by" line when it is on.

To store edited templates somewhere else, bind your own `AlfaSix\Alfakit\Mail\Contracts\MailTemplateRepository`.

## Testing

`Mail::fake()` and `Notification::fake()` work as usual. To look at the HTML, render it:

```php
$html = (string) (new OrderShipped($order))->render();
$html = (string) (new InvoicePaid($invoice))->toMail($user)->render();

expect($html)->toContain('dir="ltr"');
```

`MailPreview::renderMail(Mails::get('orders.shipped'), 'ar')` returns the subject and HTML of a registered email in a locale, the way the preview page shows it.
