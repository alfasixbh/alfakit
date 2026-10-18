<?php

declare(strict_types=1);

/*
 * Italian demo strings. Keys must match lang/en/demo.php (tests/Feature/TranslationParityTest.php).
 */
return [
    'brand' => 'Maison Alfa',
    'tagline' => 'Profumi e lifestyle, selezionati in Bahrein.',

    'navigation' => [
        'catalog' => 'Catalogo',
        'sales' => 'Vendite',
        'customers' => 'Clienti',
        'marketing' => 'Marketing',
        'reports' => 'Report',
        'settings' => 'Impostazioni',
        'showcase' => 'Vetrina',
        'support' => 'Assistenza',
        'content' => 'Contenuti',
        'system' => 'Sistema',
    ],

    'switcher' => [
        'label' => 'Renderer',
        'react' => 'React',
        'vue' => 'Vue',
        'svelte' => 'Svelte',
        'current' => ':renderer (attuale)',
    ],

    'design' => [
        'theme' => 'Tema',
        'mobile_preset' => 'Preimpostazione mobile',
        'mobile_on' => 'Navigazione in basso sugli smartphone',
        'mobile_off' => 'Menu laterale sugli smartphone',
    ],

    'footer' => [
        'note' => 'Demo di AlfaKit · ripristinata ogni ora',
        'docs' => 'Documentazione',
    ],

    'meta' => [
        'site' => 'Demo di AlfaKit',
        'title' => 'Maison Alfa · la demo di AlfaKit',
        'panel_title' => 'Amministrazione Maison Alfa · la demo di AlfaKit',
        'description' => 'Una profumeria immaginaria realizzata con AlfaKit: un’unica definizione di pannello di amministrazione Laravel, renderizzata con React, Vue e Svelte. Accedi con l’account demo condiviso; tutto viene ripristinato ogni ora.',
    ],

    'reset' => [
        'in' => 'Ripristino tra :minutes min',
        'soon' => 'Ripristino tra meno di un minuto',
        'title' => 'Il database e i file caricati della demo vengono ripristinati ogni ora, allo scoccare dell’ora.',
    ],

    'profile' => [
        'locked_heading' => 'Questo è l’account demo condiviso',
        'locked_body' => 'L’indirizzo e-mail e la password restano invariati, così il prossimo visitatore può accedere. Puoi comunque modificare il nome visualizzato.',
        'mfa_heading' => 'Autenticazione a due fattori',
        'mfa_body' => 'La configurazione è disattivata per l’account condiviso. Impersona un collega da Impostazioni › Personale per provare l’app di autenticazione e i codici via e-mail.',
    ],

    'errors' => [
        'back_home' => 'Torna al negozio',
        'open_admin' => 'Apri il pannello di amministrazione',
        '403' => ['title' => 'Non per questo account', 'body' => 'Il tuo ruolo in questo negozio non include questa pagina. Cambia negozio o chiedi l’accesso a un titolare.'],
        '404' => ['title' => 'Pagina non trovata', 'body' => 'La pagina potrebbe essere stata spostata, oppure il record è stato rimosso dal ripristino orario.'],
        '419' => ['title' => 'Pagina scaduta', 'body' => 'La sessione è scaduta. Ricarica la pagina e riprova.'],
        '429' => ['title' => 'Rallenta un po’', 'body' => 'Troppe richieste in poco tempo. Attendi un momento, poi riprova.'],
        '500' => ['title' => 'Qualcosa è andato storto', 'body' => 'L’errore è stato registrato. Riprova tra un momento.'],
        '503' => ['title' => 'Torniamo subito', 'body' => 'La demo è in fase di aggiornamento. Tornerà disponibile tra un minuto.'],
    ],

    'login' => [
        'about' => 'Maison Alfa è una profumeria immaginaria il cui pannello di amministrazione è realizzato con AlfaKit e renderizzato da React, Vue o Svelte.',
        'heading' => 'Account demo',
        'hint' => 'Accedi con :email e la password :password. Tutto ciò che modifichi viene ripristinato ogni ora.',
        'fill' => 'Usa l’account demo',
    ],

    'storefront' => [
        'title' => 'Maison Alfa',
        'nav' => [
            'home' => 'Home',
            'contact' => 'Contatti',
            'track' => 'Traccia un ordine',
            'admin' => 'Apri il pannello di amministrazione',
        ],
        'hero' => [
            'eyebrow' => 'Il negozio demo di AlfaKit',
            'title' => 'Profumi con una storia, software con carattere.',
            'body' => 'Maison Alfa è una maison di profumi immaginaria che mostra ciò che AlfaKit sa renderizzare: un’applicazione Laravel, una definizione di pannello di amministrazione, tre frontend. Sfoglia il negozio, poi apri lo stesso pannello in React, Vue o Svelte.',
            'cta' => 'Apri il pannello di amministrazione',
            'secondary' => 'Leggi la documentazione',
        ],
        'featured' => 'In evidenza questa stagione',
        'from' => 'Da :price',
        'notes' => 'Testa :top · Cuore :heart · Fondo :base',
        'by' => 'di :brand',
        'empty' => 'Ancora nessun prodotto in evidenza. Esegui php artisan demo:reset per popolare il negozio.',
        'footer' => [
            'beta' => 'Beta pubblica di AlfaKit',
            'built' => 'Realizzato con AlfaKit da Alfa Six. Negozio immaginario, software reale.',
            'renderer' => 'Renderizzato con :renderer',
        ],
    ],

    'product_status' => [
        'draft' => 'Bozza',
        'active' => 'Attivo',
        'archived' => 'Archiviato',
    ],
    'order_status' => [
        'pending' => 'In attesa',
        'paid' => 'Pagato',
        'processing' => 'In lavorazione',
        'shipped' => 'Spedito',
        'delivered' => 'Consegnato',
        'cancelled' => 'Annullato',
        'refunded' => 'Rimborsato',
    ],
    'payment_method' => [
        'card' => 'Carta',
        'apple_pay' => 'Apple Pay',
        'paypal' => 'PayPal',
        'bank_transfer' => 'Bonifico bancario',
        'cash_on_delivery' => 'Contrassegno',
    ],
    'payment_status' => [
        'pending' => 'In attesa',
        'captured' => 'Incassato',
        'failed' => 'Non riuscito',
        'refunded' => 'Rimborsato',
    ],
    'shipment_status' => [
        'pending' => 'In attesa',
        'in_transit' => 'In transito',
        'delivered' => 'Consegnata',
        'returned' => 'Resa',
    ],
    'review_status' => [
        'pending' => 'In attesa',
        'approved' => 'Approvata',
        'rejected' => 'Rifiutata',
    ],
    'discount_type' => [
        'percentage' => 'Percentuale',
        'fixed' => 'Importo fisso',
        'free_shipping' => 'Spedizione gratuita',
    ],
    'staff_role' => [
        'owner' => 'Titolare',
        'manager' => 'Responsabile',
        'staff' => 'Personale',
    ],
    'concentration' => [
        'extrait' => 'Extrait de parfum',
        'parfum' => 'Parfum',
        'eau_de_parfum' => 'Eau de parfum',
        'eau_de_toilette' => 'Eau de toilette',
        'body_mist' => 'Acqua profumata per il corpo',
        'candle' => 'Candela profumata',
        'diffuser' => 'Diffusore a bastoncini',
    ],
    'audience' => [
        'unisex' => 'Unisex',
        'women' => 'Donna',
        'men' => 'Uomo',
    ],

    'timeline' => [
        'placed' => 'Ordine effettuato',
        'paid' => 'Pagamento incassato',
        'processing' => 'Prelevato e imballato',
        'shipped' => 'Affidato a :carrier',
        'delivered' => 'Consegnato',
        'cancelled' => 'Annullato dal cliente',
        'refunded' => 'Rimborso emesso',
    ],
];
