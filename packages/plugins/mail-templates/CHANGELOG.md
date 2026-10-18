# Changelog

All notable changes to `alfasix/alfakit-mail-templates` are documented in this file.

## Unreleased

- Initial release: a `MailTemplate` model (`alfakit_mail_templates`, one row per email and locale, sanitised bodies, record versions) and a database `MailTemplateRepository`, so every mail using `UsesEditableTemplate` sends the edited subject and body; `MailTemplatesPlugin` with `authorize()` / the `manageAlfakitMailTemplates` gate, `locales()`, navigation options and `usingResource()`; `MailTemplateResource` with the email's merge tags in the RichEditor, unknown merge tags rejected, one template per email and language, Preview (sample data, light and dark, the template's direction), Send test (to the signed-in admin only), Reset to default and History.
