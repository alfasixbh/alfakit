# AlfaKit Mail Templates

<p><picture><source media="(prefers-color-scheme: dark)" srcset="../../../art/alfasix/alfa-six-micro-white.svg"><img src="../../../art/alfasix/alfa-six-micro-navy.svg" alt="" width="24" height="18" align="top"></picture> <sub>by <a href="https://alfasixbh.com">Alfa Six</a></sub></p>

Editable email templates for [AlfaKit](https://alfakit.dev) panels. Admins edit the subject and body of AlfaKit's, its plugins' and your own emails per language in the rich editor with merge tags, preview them with sample data in light and dark, send a test to themselves, reset to the default and restore earlier versions. It renders in React, Vue and Svelte with AlfaKit's built-in components.

## Installation

```bash
composer require alfasix/alfakit-mail-templates
php artisan vendor:publish --tag=alfakit-mail-templates-migrations
php artisan vendor:publish --tag=alfakit-record-versions-migrations   # once, for the history
php artisan migrate
```

## Register

```php
use AlfaSix\AlfakitMailTemplates\MailTemplatesPlugin;

$panel->plugin(
    MailTemplatesPlugin::make()
        ->authorize(fn (User $user): bool => $user->is_admin)
        ->locales(['en', 'ar']),
);
```

Without `authorize()`, only users the `manageAlfakitMailTemplates` gate allows can open it.

## Your own emails

Use the `UsesEditableTemplate` trait and register the email with `MailDefinition::make('orders.shipped')->editable([...])`. See the [emails guide](https://alfakit.dev/docs/advanced/emails#editable-templates) and the [plugin docs](https://alfakit.dev/docs/plugins/mail-templates).

## License

MIT. See [LICENSE.md](LICENSE.md).
