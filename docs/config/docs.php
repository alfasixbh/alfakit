<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Live demo
    |--------------------------------------------------------------------------
    |
    | Where the "Demo" links in the header, on the landing page and in the docs
    | point. The Markdown pages link to the canonical https://demo.alfakit.dev,
    | which is rewritten to this URL when they are rendered.
    |
    */

    'demo_url' => rtrim((string) env('ALFAKIT_DEMO_URL', 'http://alfakit-demo.localhost'), '/'),

    /*
    | The demo store the plugin pages' "Try it live" links open
    | ({demo_url}/{renderer}/admin/{tenant}/{demoPath}).
    */

    'demo_tenant' => env('ALFAKIT_DEMO_TENANT', 'manama'),

    /*
    |--------------------------------------------------------------------------
    | Repository checkout
    |--------------------------------------------------------------------------
    |
    | The website renders CHANGELOG.md and SECURITY.md from the monorepo root,
    | which is the parent of this app by default.
    |
    */

    'repository_path' => env('ALFAKIT_REPOSITORY_PATH'),

    /*
    |--------------------------------------------------------------------------
    | Dogfooding: AlfaKit plugins on this site
    |--------------------------------------------------------------------------
    |
    | The website can run on AlfaKit's own plugins: the contact page is a form of the
    | Forms plugin, page views go to the Analytics plugin (with a public read-only
    | dashboard linked from the footer), and a Helpdesk chat bubble answers visitors.
    | Each is off by default, so the site works without them: turn one on, run
    | `php artisan migrate` and `php artisan docs:dogfood`, and manage it at /admin.
    |
    */

    'dogfood' => [
        'forms' => [
            'enabled' => (bool) env('DOCS_FORMS', false),
            // The slug of the form the /contact page embeds (created by docs:dogfood).
            'contact' => env('DOCS_CONTACT_FORM', 'contact'),
        ],
        'analytics' => [
            'enabled' => (bool) env('DOCS_ANALYTICS', false),
            // The key of the analytics site the tracker reports to (created by docs:dogfood).
            'site' => env('DOCS_ANALYTICS_SITE', 'alfakit-docs'),
            // Link the site's public, read-only dashboard from the footer.
            'share' => (bool) env('DOCS_ANALYTICS_SHARE', false),
        ],
        'helpdesk' => [
            'enabled' => (bool) env('DOCS_HELPDESK_CHAT', false),
        ],
    ],

];
