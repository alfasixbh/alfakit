<?php

declare(strict_types=1);

/*
 * Suppliers (an ApiResource over the demo's fake supplier API). Keys match lang/en/suppliers.php.
 */
return [
    'label' => 'leverancier',
    'plural' => 'leveranciers',
    'navigation' => 'Leveranciers',
    'intro' => 'Leveranciers staan in een externe API (door de demo aangeboden op /demo-api/suppliers), niet in de database. De API valideert zelf: probeer een naam die al bestaat.',
    'fields' => [
        'name' => 'Naam',
        'email' => 'Bestel-e-mail',
        'country' => 'Land',
        'category' => 'Categorie',
        'status' => 'Status',
        'lead_time_days' => 'Levertijd',
        'rating' => 'Beoordeling',
        'notes' => 'Notities',
        'updated_at' => 'Bijgewerkt',
    ],
    'sections' => [
        'supplier' => 'Leverancier',
        'terms' => 'Voorwaarden',
    ],
    'lead_time' => '{1} :count dag|[2,*] :count dagen',
    'categories' => [
        'oud' => 'Oud',
        'florals' => 'Bloemen',
        'resins' => 'Harsen',
        'citrus' => 'Citrus',
        'packaging' => 'Verpakking',
    ],
    'statuses' => [
        'active' => 'Actief',
        'paused' => 'Gepauzeerd',
    ],
    'helper' => [
        'country' => 'ISO-code van twee letters, bijv. FR.',
    ],
];
