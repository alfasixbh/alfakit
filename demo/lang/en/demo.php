<?php

declare(strict_types=1);

/*
 * Demo strings rendered by AlfaKit (enum labels, slots, navigation groups, storefront).
 * Keep every key in all 13 locale folders (lang/{locale}/demo.php): tests/Feature/TranslationParityTest.php checks it.
 */
return [
    'brand' => 'Maison Alfa',
    'tagline' => 'Perfume & lifestyle, curated in Bahrain.',

    'navigation' => [
        'catalog' => 'Catalog',
        'sales' => 'Sales',
        'customers' => 'Customers',
        'marketing' => 'Marketing',
        'reports' => 'Reports',
        'settings' => 'Settings',
        'showcase' => 'Showcase',
        'support' => 'Support',
        'content' => 'Content',
        'system' => 'System',
    ],

    'switcher' => [
        'label' => 'Renderer',
        'react' => 'React',
        'vue' => 'Vue',
        'svelte' => 'Svelte',
        'current' => ':renderer (current)',
    ],

    'design' => [
        'theme' => 'Theme',
        'mobile_preset' => 'Mobile preset',
        'mobile_on' => 'Bottom navigation on phones',
        'mobile_off' => 'Drawer on phones',
    ],

    'footer' => [
        'note' => 'AlfaKit demo · reset hourly',
        'docs' => 'Documentation',
    ],

    'meta' => [
        'site' => 'AlfaKit demo',
        'title' => 'Maison Alfa · the AlfaKit demo',
        'panel_title' => 'Maison Alfa admin · the AlfaKit demo',
        'description' => 'A fictional perfume shop built with AlfaKit: one Laravel admin panel definition rendered with React, Vue and Svelte. Sign in with the shared demo account; everything resets every hour.',
    ],

    'reset' => [
        'in' => 'Resets in :minutes min',
        'soon' => 'Resets in under a minute',
        'title' => 'The demo database and uploads are restored every hour, on the hour.',
    ],

    'profile' => [
        'locked_heading' => 'This is the shared demo account',
        'locked_body' => 'Its e-mail address and password stay as they are so the next visitor can sign in. You can still change the display name.',
        'mfa_heading' => 'Two-factor authentication',
        'mfa_body' => 'Set-up is turned off for the shared account. Impersonate a colleague from Settings › Staff to try the authenticator app and e-mail codes.',
    ],

    'errors' => [
        'back_home' => 'Back to the shop',
        'open_admin' => 'Open the admin panel',
        '403' => ['title' => 'Not for this account', 'body' => 'Your role in this store doesn’t include this page. Switch store or ask an owner for access.'],
        '404' => ['title' => 'Page not found', 'body' => 'The page may have moved, or the record was removed by the hourly reset.'],
        '419' => ['title' => 'Page expired', 'body' => 'Your session timed out. Reload the page and try again.'],
        '429' => ['title' => 'Slow down a little', 'body' => 'Too many requests in a short time. Wait a moment, then try again.'],
        '500' => ['title' => 'Something went wrong', 'body' => 'The error has been logged. Try again in a moment.'],
        '503' => ['title' => 'Back shortly', 'body' => 'The demo is being refreshed. It will be back in a minute.'],
    ],

    'login' => [
        'about' => 'Maison Alfa is a fictional perfume shop whose admin panel is built with AlfaKit and rendered by React, Vue or Svelte.',
        'heading' => 'Demo account',
        'hint' => 'Sign in with :email and the password :password. Everything you change is reset every hour.',
        'fill' => 'Use the demo account',
    ],

    'storefront' => [
        'title' => 'Maison Alfa',
        'nav' => [
            'home' => 'Home',
            'contact' => 'Contact',
            'track' => 'Track an order',
            'admin' => 'Open the admin panel',
        ],
        'hero' => [
            'eyebrow' => 'The AlfaKit demo shop',
            'title' => 'Scents with a story, software with a spine.',
            'body' => 'Maison Alfa is a fictional perfume house that exists to show what AlfaKit renders: one Laravel application, one admin panel definition, three frontends. Browse the shop, then open the same panel in React, Vue or Svelte.',
            'cta' => 'Open the admin panel',
            'secondary' => 'Read the documentation',
        ],
        'featured' => 'Featured this season',
        'from' => 'From :price',
        'notes' => 'Top :top · Heart :heart · Base :base',
        'by' => 'by :brand',
        'empty' => 'No featured products yet. Run php artisan demo:reset to seed the shop.',
        'footer' => [
            'beta' => 'AlfaKit public beta',
            'built' => 'Built with AlfaKit by Alfa Six. Fictional shop, real software.',
            'renderer' => 'Rendered with :renderer',
        ],
    ],

    'product_status' => [
        'draft' => 'Draft',
        'active' => 'Active',
        'archived' => 'Archived',
    ],
    'order_status' => [
        'pending' => 'Pending',
        'paid' => 'Paid',
        'processing' => 'Processing',
        'shipped' => 'Shipped',
        'delivered' => 'Delivered',
        'cancelled' => 'Cancelled',
        'refunded' => 'Refunded',
    ],
    'payment_method' => [
        'card' => 'Card',
        'apple_pay' => 'Apple Pay',
        'paypal' => 'PayPal',
        'bank_transfer' => 'Bank transfer',
        'cash_on_delivery' => 'Cash on delivery',
    ],
    'payment_status' => [
        'pending' => 'Pending',
        'captured' => 'Captured',
        'failed' => 'Failed',
        'refunded' => 'Refunded',
    ],
    'shipment_status' => [
        'pending' => 'Pending',
        'in_transit' => 'In transit',
        'delivered' => 'Delivered',
        'returned' => 'Returned',
    ],
    'review_status' => [
        'pending' => 'Pending',
        'approved' => 'Approved',
        'rejected' => 'Rejected',
    ],
    'discount_type' => [
        'percentage' => 'Percentage',
        'fixed' => 'Fixed amount',
        'free_shipping' => 'Free shipping',
    ],
    'staff_role' => [
        'owner' => 'Owner',
        'manager' => 'Manager',
        'staff' => 'Staff',
    ],
    'concentration' => [
        'extrait' => 'Extrait de parfum',
        'parfum' => 'Parfum',
        'eau_de_parfum' => 'Eau de parfum',
        'eau_de_toilette' => 'Eau de toilette',
        'body_mist' => 'Body mist',
        'candle' => 'Scented candle',
        'diffuser' => 'Reed diffuser',
    ],
    'audience' => [
        'unisex' => 'Unisex',
        'women' => 'Women',
        'men' => 'Men',
    ],

    'timeline' => [
        'placed' => 'Order placed',
        'paid' => 'Payment captured',
        'processing' => 'Picked and packed',
        'shipped' => 'Handed to :carrier',
        'delivered' => 'Delivered',
        'cancelled' => 'Cancelled by the customer',
        'refunded' => 'Refund issued',
    ],
];
