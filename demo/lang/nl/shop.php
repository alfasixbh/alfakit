<?php

declare(strict_types=1);

/*
 * Dutch storefront strings. Keys match lang/en/shop.php (tests/Feature/ShopTranslationParityTest.php).
 */
return [
    'attributes' => [
        'name' => 'naam',
        'rating' => 'beoordeling',
        'review' => 'review',
    ],

    'locale' => [
        'label' => 'Taal',
    ],

    'strip' => [
        'eyebrow' => 'Gebouwd met AlfaKit',
        'title' => 'Eén paneeldefinitie, drie frontends.',
        'body' => 'Alles wat je hier ziet, wordt uit hetzelfde PHP-schema gerenderd. Wissel van renderer en de pagina laadt opnieuw in React, Vue of Svelte, met dezelfde markup, dezelfde opmaak en hetzelfde gedrag.',
        'cta' => 'Renderer wisselen',
        'hint' => 'Je bekijkt de :renderer-build.',
        'mascot_alt' => 'De vos, mascotte van AlfaKit',
    ],

    'newsletter' => [
        'heading' => 'Brieven uit het atelier',
        'body' => 'Een bericht wanneer er een nieuwe geur is, nooit vaker dan twee keer per maand.',
        'label' => 'E-mailadres',
        'placeholder' => 'jij@example.com',
        'submit' => 'Inschrijven',
        'duplicate' => 'Dit adres staat al op de lijst.',
        'thanks' => [
            'title' => 'Je staat op de lijst',
            'body' => 'De volgende brief van Maison Alfa komt als eerste bij jou.',
        ],
    ],

    'product' => [
        'back' => 'Alle producten',
        'by' => 'door :brand',
        'sku' => 'Referentie',
        'gallery' => 'Galerij',
        'image_of' => ':name, weergave :index',
        'sizes' => 'Formaten',
        'choose_size' => 'Kies een formaat',
        'stock' => [
            'in' => 'Op voorraad',
            'low' => 'Nog maar :count over',
            'out' => 'Uitverkocht',
        ],
        'notes' => [
            'heading' => 'Compositie',
            'top' => 'Topnoten',
            'heart' => 'Hartnoten',
            'base' => 'Basisnoten',
        ],
        'details' => [
            'heading' => 'Details',
            'concentration' => 'Concentratie',
            'audience' => 'Voor',
            'size' => 'Formaat',
            'category' => 'Categorie',
            'tags' => 'Tags',
        ],
        'enquire' => 'Vraag naar deze geur',
        'track' => 'Bestelling volgen',
        'reviews' => [
            'heading' => 'Reviews',
            'count' => '{0} Nog geen reviews|{1} Eén review|[2,*] :count reviews',
            'average' => ':average van 5',
            'empty' => 'Nog geen reviews. Vertel als eerste hoe hij draagt.',
            'verified' => 'Geverifieerde aankoop',
            'guest' => 'Gast',
            'write' => 'Review schrijven',
            'write_help' => 'Reviews worden door het team gelezen en vanuit het beheerpaneel gepubliceerd, meestal binnen een dag.',
        ],
        'related' => 'Misschien vind je dit ook mooi',
        'compare' => 'Was :price',
        'currency_note' => 'Prijzen in Amerikaanse dollars, inclusief belastingen.',
    ],

    'review' => [
        'fields' => [
            'rating' => 'Je beoordeling',
            'name' => 'Je naam',
            'email' => 'E-mail',
            'email_help' => 'Wordt nooit getoond. Als je deze geur bij ons hebt gekocht, wordt je review gemarkeerd als geverifieerde aankoop.',
            'title' => 'Kop',
            'body' => 'Je review',
        ],
        'submit' => 'Review versturen',
        'thanks' => [
            'title' => 'Bedankt, :name',
            'body' => 'Je review ligt bij het team en verschijnt zodra hij in het beheerpaneel is goedgekeurd.',
        ],
    ],

    'contact' => [
        'heading' => 'Schrijf het huis',
        'intro' => 'Een vraag over een bestelling, een geur die je niet kunt vinden, groothandel of pers: het team in Manama leest elk bericht en antwoordt binnen twee werkdagen.',
        'form_heading' => 'Bericht versturen',
        'form_help' => 'Dit is een zelfstandig AlfaKit-formulier: de validatie draait op de server, het onderwerp toont een veld voor het bestelnummer en de verzendknop heeft een limiet.',
        'details' => [
            'heading' => 'De boetiek',
            'email' => 'E-mail',
            'phone' => 'Telefoon',
            'hours' => 'Openingstijden',
            'hours_value' => 'Zaterdag tot en met donderdag, 10:00 tot 22:00',
            'address' => 'Bahrain Bay, Manama',
        ],
        'fields' => [
            'name' => 'Je naam',
            'email' => 'E-mail',
            'topic' => 'Onderwerp',
            'order_number' => 'Bestelnummer',
            'message' => 'Bericht',
            'message_help' => 'Minimaal 20 tekens. Vermeld de geur of bestelling waarover je schrijft.',
        ],
        'topics' => [
            'order' => 'Een bestelling',
            'product' => 'Een product',
            'wholesale' => 'Groothandel',
            'press' => 'Pers',
            'other' => 'Iets anders',
        ],
        'prefill' => 'Ik wil graag meer weten over :product.',
        'submit' => 'Bericht versturen',
        'mail_subject' => 'Contact Maison Alfa: :topic',
        'thanks' => [
            'title' => 'Bedankt, :name',
            'body' => 'We antwoorden binnen twee werkdagen naar :email.',
        ],
        'rate_limited' => 'Je hebt al een paar berichten verstuurd',
    ],

    'track' => [
        'heading' => 'Bestelling volgen',
        'intro' => 'Vul het e-mailadres in dat je bij het afrekenen gebruikte en het bestelnummer uit je bevestiging. Je ziet alle bestellingen van dat account en de volledige route van de gevraagde bestelling.',
        'fields' => [
            'email' => 'E-mail bij het afrekenen',
            'number' => 'Bestelnummer',
            'submit' => 'Mijn bestelling zoeken',
        ],
        'sample' => [
            'heading' => 'Probeer het met een echte bestelling',
            'body' => 'Dit is een demowinkel, dus hier is een aangemaakte bestelling die je kunt opzoeken:',
            'use' => 'Deze bestelling gebruiken',
        ],
        'not_found' => [
            'heading' => 'We konden die bestelling niet vinden',
            'body' => 'Controleer het e-mailadres en het bestelnummer, of gebruik de voorbeeldbestelling hieronder.',
        ],
        'orders' => [
            'heading' => 'Je bestellingen',
            'description' => 'Alles wat :name heeft besteld. Klik op een bestelling om de tijdlijn te zien.',
            'number' => 'Bestelling',
            'placed' => 'Geplaatst',
            'items' => 'Artikelen',
            'status' => 'Status',
            'total' => 'Totaal',
            'search' => 'Zoeken op bestelnummer',
        ],
        'timeline' => [
            'heading' => 'Bestelling :number',
            'description' => 'Elke stap, van afrekenen tot aan je deur.',
            'steps' => 'Tijdlijn',
            'carrier' => 'Vervoerder',
            'tracking' => 'Trackingnummer',
            'ship_to' => 'Verzenden naar',
            'no_shipment' => 'Nog niet verzonden',
            'no_tracking' => 'Beschikbaar na verzending',
        ],
        'components_note' => 'De bestellingentabel en de tijdlijn zijn zelfstandige AlfaKit-componenten: een Table en een Infolist, gerenderd in de winkellay-out.',
    ],
];
