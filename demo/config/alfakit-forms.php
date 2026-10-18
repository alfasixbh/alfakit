<?php

declare(strict_types=1);
use AlfaSix\AlfakitForms\Models\Form;
use AlfaSix\AlfakitForms\Models\FormSubmission;
use App\Http\Middleware\SetStorefrontLocale;

return [

    /*
    |--------------------------------------------------------------------------
    | Public route
    |--------------------------------------------------------------------------
    |
    | Published forms are served outside every panel at /{prefix}/{slug}. The route
    | renders the Inertia page named below (create it with `php artisan
    | alfakit-forms:page`) with the form as its `form` prop. Use your own route and
    | `AlfakitForms::embed()` instead by turning the route off.
    |
    */

    'route' => [
        'enabled' => true,
        'prefix' => 'forms',
        // Demo: the storefront language (EN / AR) applies to the public plugin pages too.
        'middleware' => ['web', SetStorefrontLocale::class],
        'name' => 'alfakit-forms.',
        'domain' => null,
    ],

    'page' => 'Storefront/Form',

    /*
    |--------------------------------------------------------------------------
    | Models
    |--------------------------------------------------------------------------
    */

    'models' => [
        'form' => Form::class,
        'submission' => FormSubmission::class,
    ],

    /*
    |--------------------------------------------------------------------------
    | File uploads
    |--------------------------------------------------------------------------
    |
    | Answers of file fields are stored on this disk (private by default) under
    | {directory}/{form id}. Admins download them through a signed, short-lived URL.
    | `max_size` (kilobytes) caps whatever a form allows.
    |
    */

    'uploads' => [
        'disk' => 'local',
        'directory' => 'alfakit-forms',
        'max_size' => 4096, // Demo: the 4 MB cap of every demo upload.
        'max_files' => 10,
    ],

    /*
    |--------------------------------------------------------------------------
    | Abuse protection
    |--------------------------------------------------------------------------
    |
    | Submissions are rate limited per form and IP address. Spam (a filled honeypot
    | or a form sent faster than `min_seconds` after it was shown) is accepted as if
    | it were real, so bots learn nothing, and stored flagged as spam (or dropped
    | with `store => false`). Spam never counts toward limits or notifications.
    |
    */

    'rate_limit' => [
        'max_attempts' => 5,
        'decay_seconds' => 60,
    ],

    'spam' => [
        'honeypot_field' => '_website',
        'min_seconds' => 2,
        'store' => true,
    ],

    // Keep the submitter's IP address and user agent with each submission.
    'store_ip_address' => true,

    /*
    |--------------------------------------------------------------------------
    | Notification emails
    |--------------------------------------------------------------------------
    */

    'mail' => [
        'connection' => null,
        'queue' => null,
    ],

];
