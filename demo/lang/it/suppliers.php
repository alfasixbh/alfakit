<?php

declare(strict_types=1);

/*
 * Suppliers (an ApiResource over the demo's fake supplier API). Keys match lang/en/suppliers.php.
 */
return [
    'label' => 'fornitore',
    'plural' => 'fornitori',
    'navigation' => 'Fornitori',
    'intro' => 'I fornitori si trovano in un’API esterna (servita dalla demo su /demo-api/suppliers), non nel database. L’API esegue la propria validazione: prova un nome già esistente.',
    'fields' => [
        'name' => 'Nome',
        'email' => 'E-mail per gli ordini',
        'country' => 'Paese',
        'category' => 'Categoria',
        'status' => 'Stato',
        'lead_time_days' => 'Tempi di consegna',
        'rating' => 'Valutazione',
        'notes' => 'Note',
        'updated_at' => 'Aggiornato',
    ],
    'sections' => [
        'supplier' => 'Fornitore',
        'terms' => 'Condizioni',
    ],
    'lead_time' => '{1} :count giorno|[2,*] :count giorni',
    'categories' => [
        'oud' => 'Oud',
        'florals' => 'Floreali',
        'resins' => 'Resine',
        'citrus' => 'Agrumi',
        'packaging' => 'Imballaggi',
    ],
    'statuses' => [
        'active' => 'Attivo',
        'paused' => 'In pausa',
    ],
    'helper' => [
        'country' => 'Codice ISO di due lettere, ad es. FR.',
    ],
];
