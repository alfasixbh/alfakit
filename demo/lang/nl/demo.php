<?php

declare(strict_types=1);

/*
 * Dutch demo strings. Keys must match lang/en/demo.php (tests/Feature/TranslationParityTest.php).
 */
return [
    'brand' => 'Maison Alfa',
    'tagline' => 'Parfum & lifestyle, samengesteld in Bahrein.',

    'navigation' => [
        'catalog' => 'Catalogus',
        'sales' => 'Verkoop',
        'customers' => 'Klanten',
        'marketing' => 'Marketing',
        'reports' => 'Rapporten',
        'settings' => 'Instellingen',
        'showcase' => 'Showcase',
        'support' => 'Support',
        'content' => 'Content',
        'system' => 'Systeem',
    ],

    'switcher' => [
        'label' => 'Renderer',
        'react' => 'React',
        'vue' => 'Vue',
        'svelte' => 'Svelte',
        'current' => ':renderer (huidig)',
    ],

    'design' => [
        'theme' => 'Thema',
        'mobile_preset' => 'Mobiele voorinstelling',
        'mobile_on' => 'Navigatie onderaan op telefoons',
        'mobile_off' => 'Zijmenu op telefoons',
    ],

    'footer' => [
        'note' => 'AlfaKit-demo · elk uur gereset',
        'docs' => 'Documentatie',
    ],

    'meta' => [
        'site' => 'AlfaKit-demo',
        'title' => 'Maison Alfa · de AlfaKit-demo',
        'panel_title' => 'Maison Alfa-beheer · de AlfaKit-demo',
        'description' => 'Een fictieve parfumwinkel gebouwd met AlfaKit: één Laravel-beheerpaneeldefinitie, gerenderd met React, Vue en Svelte. Log in met het gedeelde demoaccount; alles wordt elk uur gereset.',
    ],

    'reset' => [
        'in' => 'Reset over :minutes min',
        'soon' => 'Reset binnen een minuut',
        'title' => 'De demodatabase en uploads worden elk heel uur hersteld.',
    ],

    'profile' => [
        'locked_heading' => 'Dit is het gedeelde demoaccount',
        'locked_body' => 'Het e-mailadres en wachtwoord blijven ongewijzigd, zodat de volgende bezoeker kan inloggen. De weergavenaam kun je wel wijzigen.',
        'mfa_heading' => 'Tweestapsverificatie',
        'mfa_body' => 'Instellen is uitgeschakeld voor het gedeelde account. Neem via Instellingen › Medewerkers de rol van een collega aan om de authenticator-app en e-mailcodes uit te proberen.',
    ],

    'errors' => [
        'back_home' => 'Terug naar de winkel',
        'open_admin' => 'Beheerpaneel openen',
        '403' => ['title' => 'Niet voor dit account', 'body' => 'Je rol in deze winkel omvat deze pagina niet. Wissel van winkel of vraag een eigenaar om toegang.'],
        '404' => ['title' => 'Pagina niet gevonden', 'body' => 'De pagina is mogelijk verplaatst, of het record is verwijderd door de reset van elk uur.'],
        '419' => ['title' => 'Pagina verlopen', 'body' => 'Je sessie is verlopen. Laad de pagina opnieuw en probeer het nog eens.'],
        '429' => ['title' => 'Iets rustiger aan', 'body' => 'Te veel verzoeken in korte tijd. Wacht even en probeer het dan opnieuw.'],
        '500' => ['title' => 'Er ging iets mis', 'body' => 'De fout is vastgelegd. Probeer het zo meteen opnieuw.'],
        '503' => ['title' => 'Zo terug', 'body' => 'De demo wordt ververst. Over een minuut is hij weer beschikbaar.'],
    ],

    'login' => [
        'about' => 'Maison Alfa is een fictieve parfumwinkel waarvan het beheerpaneel met AlfaKit is gebouwd en door React, Vue of Svelte wordt gerenderd.',
        'heading' => 'Demoaccount',
        'hint' => 'Log in met :email en het wachtwoord :password. Alles wat je wijzigt, wordt elk uur gereset.',
        'fill' => 'Demoaccount gebruiken',
    ],

    'storefront' => [
        'title' => 'Maison Alfa',
        'nav' => [
            'home' => 'Home',
            'contact' => 'Contact',
            'track' => 'Bestelling volgen',
            'admin' => 'Beheerpaneel openen',
        ],
        'hero' => [
            'eyebrow' => 'De AlfaKit-demowinkel',
            'title' => 'Geuren met een verhaal, software met ruggengraat.',
            'body' => 'Maison Alfa is een fictief parfumhuis dat laat zien wat AlfaKit rendert: één Laravel-applicatie, één beheerpaneeldefinitie, drie frontends. Bekijk de winkel en open daarna hetzelfde paneel in React, Vue of Svelte.',
            'cta' => 'Beheerpaneel openen',
            'secondary' => 'Documentatie lezen',
        ],
        'featured' => 'Uitgelicht dit seizoen',
        'from' => 'Vanaf :price',
        'notes' => 'Top :top · Hart :heart · Basis :base',
        'by' => 'door :brand',
        'empty' => 'Nog geen uitgelichte producten. Voer php artisan demo:reset uit om de winkel te vullen.',
        'footer' => [
            'beta' => 'Publieke bèta van AlfaKit',
            'built' => 'Gebouwd met AlfaKit door Alfa Six. Fictieve winkel, echte software.',
            'renderer' => 'Gerenderd met :renderer',
        ],
    ],

    'product_status' => [
        'draft' => 'Concept',
        'active' => 'Actief',
        'archived' => 'Gearchiveerd',
    ],
    'order_status' => [
        'pending' => 'In afwachting',
        'paid' => 'Betaald',
        'processing' => 'In behandeling',
        'shipped' => 'Verzonden',
        'delivered' => 'Bezorgd',
        'cancelled' => 'Geannuleerd',
        'refunded' => 'Terugbetaald',
    ],
    'payment_method' => [
        'card' => 'Kaart',
        'apple_pay' => 'Apple Pay',
        'paypal' => 'PayPal',
        'bank_transfer' => 'Bankoverschrijving',
        'cash_on_delivery' => 'Rembours',
    ],
    'payment_status' => [
        'pending' => 'In afwachting',
        'captured' => 'Geïnd',
        'failed' => 'Mislukt',
        'refunded' => 'Terugbetaald',
    ],
    'shipment_status' => [
        'pending' => 'In afwachting',
        'in_transit' => 'Onderweg',
        'delivered' => 'Bezorgd',
        'returned' => 'Geretourneerd',
    ],
    'review_status' => [
        'pending' => 'In afwachting',
        'approved' => 'Goedgekeurd',
        'rejected' => 'Afgewezen',
    ],
    'discount_type' => [
        'percentage' => 'Percentage',
        'fixed' => 'Vast bedrag',
        'free_shipping' => 'Gratis verzending',
    ],
    'staff_role' => [
        'owner' => 'Eigenaar',
        'manager' => 'Manager',
        'staff' => 'Medewerker',
    ],
    'concentration' => [
        'extrait' => 'Extrait de parfum',
        'parfum' => 'Parfum',
        'eau_de_parfum' => 'Eau de parfum',
        'eau_de_toilette' => 'Eau de toilette',
        'body_mist' => 'Bodymist',
        'candle' => 'Geurkaars',
        'diffuser' => 'Geurstokjes',
    ],
    'audience' => [
        'unisex' => 'Unisex',
        'women' => 'Dames',
        'men' => 'Heren',
    ],

    'timeline' => [
        'placed' => 'Bestelling geplaatst',
        'paid' => 'Betaling geïnd',
        'processing' => 'Verzameld en ingepakt',
        'shipped' => 'Overgedragen aan :carrier',
        'delivered' => 'Bezorgd',
        'cancelled' => 'Geannuleerd door de klant',
        'refunded' => 'Terugbetaling uitgevoerd',
    ],
];
