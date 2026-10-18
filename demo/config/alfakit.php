<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Default filesystem disk
    |--------------------------------------------------------------------------
    |
    | Used by FileUpload fields, rich editor attachments and image columns when
    | no explicit disk is configured on the component.
    |
    */

    'default_filesystem_disk' => env('ALFAKIT_FILESYSTEM_DISK', env('FILESYSTEM_DISK', 'public')),

    /*
    |--------------------------------------------------------------------------
    | Temporary uploads
    |--------------------------------------------------------------------------
    |
    | Files are first streamed to this disk/directory and moved to their final
    | location when the form is submitted. Schedule `alfakit:prune-uploads` to
    | clean up abandoned uploads older than `max_age_hours`.
    |
    */

    'uploads' => [
        'temporary_disk' => env('ALFAKIT_TEMPORARY_DISK', 'local'),
        'temporary_directory' => 'alfakit-tmp',
        'max_age_hours' => 24,
        'max_size_kb' => (int) env('ALFAKIT_UPLOAD_MAX_KB', 4096), // public demo: 4 MB per file (throttled by App\Http\Middleware\ThrottleDemoUploads)
    ],

    /*
    |--------------------------------------------------------------------------
    | Internal routes
    |--------------------------------------------------------------------------
    |
    | Prefix for the JSON endpoints every panel exposes (action execution,
    | reactive schema refresh, searchable select options, uploads, …).
    |
    */

    'system_route_prefix' => '_alfakit',

    /*
    |--------------------------------------------------------------------------
    | Inertia
    |--------------------------------------------------------------------------
    |
    | The Blade root view used for panel pages and the Vite entry points it
    | loads. `alfakit:install` publishes the entry files for your adapter.
    |
    */

    'inertia' => [
        'root_view' => 'demo.panel', // the package view plus the demo's head tags (resources/views/demo/panel.blade.php)
        'vite' => [
            // Each demo panel sets its own entries with `->viteTheme([...])` (see App\Demo\DemoPanel).
            'css' => 'resources/css/react.css',
            'js' => 'resources/js/react/app.tsx',
        ],
        'page_component' => 'Alfakit/Page',
    ],

    /*
    |--------------------------------------------------------------------------
    | Database notifications
    |--------------------------------------------------------------------------
    */

    'notifications' => [
        'polling_interval' => '30s',
    ],

    /*
    |--------------------------------------------------------------------------
    | Code generation
    |--------------------------------------------------------------------------
    |
    | Defaults for the `make:alfakit-*` commands.
    |
    */

    'file_generation' => [
        'namespace' => 'App\\Alfakit',
        'path' => app_path('Alfakit'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Component discovery caching
    |--------------------------------------------------------------------------
    |
    | Run `alfakit:optimize` in deployment to cache discovered resources, pages
    | and widgets instead of scanning the filesystem on every request.
    |
    */

    'cache_path' => base_path('bootstrap/cache/alfakit'),

    /*
    |--------------------------------------------------------------------------
    | Broadcasting
    |--------------------------------------------------------------------------
    |
    | Optionally use Laravel Echo for real-time database notifications instead
    | of polling. Mirrors the config keys expected by the frontend.
    |
    */

    'broadcasting' => [
        'echo' => null,
        // 'echo' => [
        //     'broadcaster' => 'reverb',
        //     'key' => env('VITE_REVERB_APP_KEY'),
        //     'wsHost' => env('VITE_REVERB_HOST'),
        //     'wsPort' => env('VITE_REVERB_PORT'),
        //     'forceTLS' => true,
        // ],
    ],

    /*
    |--------------------------------------------------------------------------
    | "Powered by AlfaKit · Alfa Six" credit
    |--------------------------------------------------------------------------
    |
    | Off by default in apps; the demo is an Alfa Six property, so its CMS
    | pages, public forms, helpdesk portal and chat, shared dashboards,
    | invoice links and emails show it.
    |
    */

    'credit' => [
        'public_pages' => (bool) env('ALFAKIT_POWERED_BY', true),
        'emails' => (bool) env('ALFAKIT_POWERED_BY_EMAILS', true),
    ],

];
