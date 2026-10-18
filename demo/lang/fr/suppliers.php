<?php

declare(strict_types=1);

/*
 * Suppliers (an ApiResource over the demo's fake supplier API). Keys match lang/en/suppliers.php.
 */
return [
    'label' => 'fournisseur',
    'plural' => 'fournisseurs',
    'navigation' => 'Fournisseurs',
    'intro' => 'Les fournisseurs se trouvent dans une API externe (servie par la démo sur /demo-api/suppliers), pas dans la base de données. L’API valide elle-même les données : essayez un nom qui existe déjà.',
    'fields' => [
        'name' => 'Nom',
        'email' => 'E-mail de commande',
        'country' => 'Pays',
        'category' => 'Catégorie',
        'status' => 'Statut',
        'lead_time_days' => 'Délai de livraison',
        'rating' => 'Note',
        'notes' => 'Notes',
        'updated_at' => 'Mis à jour',
    ],
    'sections' => [
        'supplier' => 'Fournisseur',
        'terms' => 'Conditions',
    ],
    'lead_time' => '{1} :count jour|[2,*] :count jours',
    'categories' => [
        'oud' => 'Oud',
        'florals' => 'Floraux',
        'resins' => 'Résines',
        'citrus' => 'Agrumes',
        'packaging' => 'Emballage',
    ],
    'statuses' => [
        'active' => 'Actif',
        'paused' => 'En pause',
    ],
    'helper' => [
        'country' => 'Code ISO à deux lettres, par ex. FR.',
    ],
];
