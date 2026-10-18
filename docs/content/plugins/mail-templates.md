---
title: Mail templates
description: Let admins edit the subject and body of AlfaKit's, its plugins' and your emails per language, with merge tags, previews, test emails and history.
---

# Mail templates

`alfasix/alfakit-mail-templates` adds a **Mail templates** resource to a panel. Admins pick an email and a language and write their own subject and body in the rich editor, using the email's merge tags. Everything else stays in code: the [email theme](/docs/advanced/emails), when emails are sent and the data they carry.

- Every editable email of AlfaKit and its plugins is listed: sign-in codes, email change, password reset, email verification, user and team invitations, helpdesk replies, invoices, form submissions, workflow and webhook notices, plus [your own](/docs/advanced/emails#editable-templates).
- **Merge tags** come from the email (`{{ name }}`, `{{ button }}`…). The editor's toolbar inserts them, and saving rejects tags the email doesn't offer.
- **Preview** renders the saved template with sample data, light and dark, in its language (right to left for Arabic).
- **Send test** emails it to you, the signed-in admin, and nobody else.
- **Reset to default** gives the email its own subject and content back.
- **History**: every save is a version you can compare and restore (AlfaKit's record versions).
- Bodies are sanitised when saved and when sent.

## Installation

```bash
composer require alfasix/alfakit-mail-templates
php artisan vendor:publish --tag=alfakit-mail-templates-migrations
php artisan vendor:publish --tag=alfakit-record-versions-migrations   # once, for the history
php artisan migrate
```

The migration creates `alfakit_mail_templates` (`key`, `locale`, nullable `subject` and `body`, unique per email and language). Without `alfakit_record_versions` everything works except the history.

## Register

```php
use AlfaSix\AlfakitMailTemplates\MailTemplatesPlugin;

$panel->plugin(
    MailTemplatesPlugin::make()
        ->authorize(fn (User $user): bool => $user->is_admin)
        ->locales(['en', 'ar'])          // default: the panel's locales
        ->navigationGroup('Settings'),
);
```

Without `authorize()`, only users the `manageAlfakitMailTemplates` gate allows see the resource:

```php
Gate::define('manageAlfakitMailTemplates', fn (User $user): bool => $user->is_admin);
```

A policy for `AlfaSix\AlfakitMailTemplates\Models\MailTemplate` narrows it further per action.

Edited templates are read by every mail that opts in, wherever it is sent from (another panel, a queue worker, a console command): the service provider binds the database repository as soon as the package is installed. The resource only appears on panels with the plugin.

## How a template is used

| Template                          | The email sends                                     |
| --------------------------------- | --------------------------------------------------- |
| None for the recipient's language | Its own subject and content (translated)            |
| Subject and body                  | The template, merge tags filled, in the email theme |
| Subject only                      | The template's subject with its own content         |
| Reset (both empty)                | Its own subject and content                         |

A `pt_BR` email also uses a `pt` template. The "Powered by" line, when on, is added after the body.

## Options

| Method                                   | Default                      | Does                                   |
| ---------------------------------------- | ---------------------------- | -------------------------------------- |
| `authorize(bool\|Closure\|null)`         | the gate                     | Who may manage templates               |
| `gate(string)`                           | `manageAlfakitMailTemplates` | The gate checked without `authorize()` |
| `locales(array\|Closure\|null)`          | the panel's locales          | Languages templates are written in     |
| `navigationGroup(string\|Closure\|null)` | none                         | Navigation group                       |
| `navigationSort(int\|Closure\|null)`     | none                         | Navigation sort                        |
| `navigationIcon(string\|Closure\|null)`  | `mail`                       | Navigation icon                        |
| `usingResource(class-string)`            | `MailTemplateResource`       | Your subclass of the resource          |

## Testing

```php
use AlfaSix\AlfakitMailTemplates\Models\MailTemplate;

MailTemplate::create([
    'key' => 'alfakit.multi-factor-code',
    'locale' => 'en',
    'subject' => 'Your code: {{ code }}',
    'body' => '<p>Use <span data-type="mergeTag" data-id="code">{{ code }}</span> to sign in.</p>',
]);

$mail = (new VerifyEmailAuthentication('123456', 10))->toMail($user);

expect($mail->subject)->toBe('Your code: 123456');
```
