<?php

declare(strict_types=1);

/*
 * Suppliers (an ApiResource over the demo's fake supplier API). Keys match lang/en/suppliers.php.
 */
return [
    'label' => 'Lieferant',
    'plural' => 'Lieferanten',
    'navigation' => 'Lieferanten',
    'intro' => 'Lieferanten liegen in einer externen API (von der Demo unter /demo-api/suppliers bereitgestellt), nicht in der Datenbank. Die API validiert selbst: Probieren Sie einen Namen, der bereits existiert.',
    'fields' => [
        'name' => 'Name',
        'email' => 'Bestell-E-Mail',
        'country' => 'Land',
        'category' => 'Kategorie',
        'status' => 'Status',
        'lead_time_days' => 'Lieferzeit',
        'rating' => 'Bewertung',
        'notes' => 'Notizen',
        'updated_at' => 'Aktualisiert',
    ],
    'sections' => [
        'supplier' => 'Lieferant',
        'terms' => 'Konditionen',
    ],
    'lead_time' => '{1} :count Tag|[2,*] :count Tage',
    'categories' => [
        'oud' => 'Oud',
        'florals' => 'Blüten',
        'resins' => 'Harze',
        'citrus' => 'Zitrus',
        'packaging' => 'Verpackung',
    ],
    'statuses' => [
        'active' => 'Aktiv',
        'paused' => 'Pausiert',
    ],
    'helper' => [
        'country' => 'Zweistelliger ISO-Code, z. B. FR.',
    ],
];
