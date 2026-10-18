<?php

declare(strict_types=1);

/*
 * Suppliers (an ApiResource over the demo's fake supplier API). Mirror every key in all 13 locale folders,
 * lang/{locale}/suppliers.php: tests/Feature/SupplierResourceTest.php checks it.
 */
return [
    'label' => 'supplier',
    'plural' => 'suppliers',
    'navigation' => 'Suppliers',
    'intro' => 'Suppliers live in an external API (served by the demo at /demo-api/suppliers), not in the database. The API validates on its own: try a name that already exists.',
    'fields' => [
        'name' => 'Name',
        'email' => 'Order e-mail',
        'country' => 'Country',
        'category' => 'Category',
        'status' => 'Status',
        'lead_time_days' => 'Lead time',
        'rating' => 'Rating',
        'notes' => 'Notes',
        'updated_at' => 'Updated',
    ],
    'sections' => [
        'supplier' => 'Supplier',
        'terms' => 'Terms',
    ],
    'lead_time' => '{1} :count day|[2,*] :count days',
    'categories' => [
        'oud' => 'Oud',
        'florals' => 'Florals',
        'resins' => 'Resins',
        'citrus' => 'Citrus',
        'packaging' => 'Packaging',
    ],
    'statuses' => [
        'active' => 'Active',
        'paused' => 'Paused',
    ],
    'helper' => [
        'country' => 'Two-letter ISO code, e.g. FR.',
    ],
];
