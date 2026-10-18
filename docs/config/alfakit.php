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
        'max_size_kb' => 12288,
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
        'root_view' => 'alfakit::app',
        'vite' => [
            'css' => 'resources/css/alfakit.css',
            'js' => env('ALFAKIT_VITE_ENTRY', 'resources/js/alfakit/app.tsx'),
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

];
