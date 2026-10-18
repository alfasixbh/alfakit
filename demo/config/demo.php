<?php

declare(strict_types=1);

return [
    // The public AlfaKit website (docs, AI page). Change ALFAKIT_SITE_URL when the domain is live.
    'site_url' => rtrim((string) env('ALFAKIT_SITE_URL', 'https://alfakit.dev'), '/'),

    /*
    |--------------------------------------------------------------------------
    | Seed scale
    |--------------------------------------------------------------------------
    |
    | Multiplies the number of products, customers and orders DemoSeeder creates
    | (1.0 ≈ 150 products, 400 customers, 1,200 orders). Tests use 0.1.
    |
    */

    'seed_scale' => (float) env('DEMO_SEED_SCALE', 1.0),

    'login' => [
        'email' => 'demo@alfakit.dev',
        'password' => 'password',
    ],

];
