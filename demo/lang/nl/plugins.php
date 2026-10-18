<?php

declare(strict_types=1);

/*
 * Dutch strings of the first-party plugin integration. Keys match lang/en/plugins.php.
 */
return [
    'commands' => [
        'group' => 'Maison Alfa',
        'order_board' => 'Bestellingenbord openen',
        'calendar' => 'Winkelkalender openen',
        'returns' => 'Retouren beoordelen',
        'category_tree' => 'Categorieboom ordenen',
        'new_product' => 'Product toevoegen',
        'storefront' => 'Webwinkel openen',
    ],

    'board' => [
        'title' => 'Bestellingenbord',
        'subheading' => 'Sleep bestellingen door de afhandeling, of verplaats ze met het toetsenbord (spatie, pijltjes, spatie). De afgelopen 60 dagen.',
        'open' => 'Bord',
        'timeline_note' => 'Verplaatst op het bestellingenbord door :user',
    ],

    'calendar' => [
        'title' => 'Kalender',
        'subheading' => 'Acties, zendingen, leveringen en geplande pagina’s van deze winkel.',
        'this_week' => 'Deze week',
        'new_promotion' => 'Actie plannen',
        'hint' => 'Sleep een actie om hem te verplaatsen, sleep het einde om de looptijd te wijzigen, klik om te bewerken, selecteer dagen om een nieuwe te plannen.',
        'fields' => [
            'value' => 'Waarde (% of bedrag)',
        ],
        'legend' => [
            'label' => 'Legenda',
            'percentage' => 'Actie: percentage korting',
            'fixed' => 'Actie: bedrag korting',
            'free_shipping' => 'Actie: gratis verzending',
            'shipped' => 'Zending heeft de boetiek verlaten',
            'delivered' => 'Bezorgd',
            'publish' => 'Geplande pagina',
        ],
        'events' => [
            'shipped' => ':number verzonden (:carrier)',
            'delivered' => ':number bezorgd',
            'publish' => 'Publiceren: :title',
        ],
    ],

    'returns' => [
        'label' => 'retour',
        'plural' => 'Retouren',
        'workflow' => 'Goedkeuring van retouren',
        'subheading' => 'Support opent een retour vanuit een bestelling en dient hem in; een eigenaar of manager keurt hem goed via Goedkeuringen; goedgekeurde retouren worden terugbetaald.',
        'empty' => 'Nog geen retouren',
        'request' => 'Retour aanvragen',
        'request_heading' => 'Retour voor bestelling :number',
        'created' => 'Retour :number geopend. Dien hem ter goedkeuring in zodra hij compleet is.',
        'timeline_note' => 'Terugbetaald via retour :number',
        'states' => [
            'requested' => 'Aangevraagd',
            'awaiting_approval' => 'Wacht op goedkeuring',
            'approved' => 'Goedgekeurd',
            'rejected' => 'Afgewezen',
            'refunded' => 'Terugbetaald',
            'closed' => 'Gesloten',
        ],
        'transitions' => [
            'submit' => 'Ter goedkeuring indienen',
            'refund' => 'Terugbetalen',
            'reopen' => 'Heropenen',
            'close' => 'Sluiten',
        ],
        'steps' => [
            'manager' => 'Goedkeuring door manager',
        ],
        'reasons' => [
            'damaged' => 'Beschadigd tijdens transport',
            'wrong_item' => 'Verkeerd artikel',
            'not_as_described' => 'Niet zoals beschreven',
            'allergy' => 'Huidreactie',
            'changed_mind' => 'Bedacht',
        ],
        'fields' => [
            'number' => 'Retour',
            'state' => 'Status',
            'reason' => 'Reden',
            'amount' => 'Terugbetalingsbedrag',
            'details' => 'Details',
            'requested_by' => 'Geopend door',
            'refund_reference' => 'Referentie terugbetaling',
        ],
        'sections' => [
            'workflow' => 'Workflow',
            'history' => 'Geschiedenis',
            'details' => 'Retour',
        ],
    ],

    'invoices' => [
        'issue' => 'Factuur uitgeven',
        'open' => 'Factuur openen',
        'issue_description' => 'Maakt een factuur van de bestelregels, met btw volgens de belastingtarieven van de winkel.',
        'notes' => 'Factuur voor bestelling :number. Bedankt voor je aankoop bij Maison Alfa.',
        'terms' => 'Betaling binnen 14 dagen. Voorbeelddocument van de AlfaKit-demo.',
    ],

    'comments' => [
        'section' => 'Interne opmerkingen',
        'section_description' => 'Alleen zichtbaar voor medewerkers. Typ @ om een collega te noemen; die krijgt een melding bij het belletje.',
    ],

    'activity' => [
        'section' => 'Audittrail',
    ],

    'helpdesk' => [
        'greeting' => 'Hallo! Vraag ons alles over onze geuren of je bestelling.',
    ],

    'tree' => [
        'title' => 'Categorieboom',
        'subheading' => 'Sleep categorieën om ze te nesten of te herschikken (of gebruik de pijlknoppen) en sla daarna op. Categorieën worden door alle winkels gedeeld.',
        'open' => 'Boomweergave',
    ],

    'tags' => [
        'segments' => 'Segmenten',
    ],

    'media' => [
        'gallery' => 'Lifestylegalerij',
        'gallery_description' => 'Extra afbeeldingen in de mediabibliotheek (los van de productafbeeldingen hierboven).',
    ],

    'views' => [
        'low_stock' => 'Lage voorraad',
        'featured' => 'Uitgelicht',
        'drafts' => 'Concepten',
    ],

    'ai' => [
        'summarise_reviews' => 'Reviews samenvatten',
        'summarise_heading' => 'Wat klanten zeggen over :name',
        'summarise_prompt' => 'Vat deze klantreviews van het parfum ‘:name’ samen in drie korte opsommingstekens: wat ze geweldig vinden, wat ze bekritiseren en bij wie het past.',
    ],

    'settings' => [
        'title' => 'Instellingen van het huis',
        'subheading' => 'Gedeeld door alle winkels van Maison Alfa. De webwinkel toont de aankondiging.',
        'sections' => [
            'brand' => 'Huis en webwinkel',
            'notifications' => 'Meldingen',
        ],
        'fields' => [
            'house_name' => 'Naam van het huis',
            'announcement' => 'Aankondiging in de webwinkel',
            'announcement_help' => 'Wordt boven aan elke winkelpagina getoond. Laat leeg om te verbergen.',
            'support_hours' => 'Supporttijden',
            'price_display' => 'Prijzen in de webwinkel',
            'low_stock_alerts' => 'Meldingen bij lage voorraad',
            'weekly_report' => 'Wekelijks verkooprapport',
            'report_recipients' => 'Ontvangers van het rapport',
            'report_recipients_help' => 'E-mailadressen (de demo schrijft e-mails alleen naar het log).',
        ],
        'price_display' => [
            'tax_inclusive' => 'Inclusief btw',
            'tax_exclusive' => 'Exclusief btw',
        ],
    ],

    'backups' => [
        'read_only' => 'Alleen-lezen in de publieke demo: back-ups maken, downloaden en verwijderen is uitgeschakeld. De demodatabase wordt elk uur opnieuw opgebouwd.',
    ],

    'billing' => [
        'compare_plans' => 'Abonnementen vergelijken',
        'compare_plans_body' => 'De abonnementenpagina van de Billing-plugin toont elk abonnement met zijn functies. In de demo wordt nooit een betaling uitgevoerd.',
        'see_plans' => 'Abonnementen bekijken',
        'checkout_disabled' => 'Afrekenen is uitgeschakeld in de publieke demo',
        'checkout_disabled_body' => 'Je hebt het abonnement :plan gekozen. Een echte winkel zou nu Stripe Checkout openen; de demo neemt nooit contact op met een betaalprovider.',
        'contact' => 'Neem contact op',
        'plans' => [
            'boutique' => 'Eén boetiek en de bijbehorende webwinkel.',
            'maison' => 'Meerdere boetieks met gedeelde catalogus en rapporten.',
            'enterprise' => 'Franchises, integraties op maat en SSO.',
        ],
        'features' => [
            'boutique' => ['1 winkel', '5 medewerkersaccounts', 'Support per e-mail'],
            'maison' => ['Onbeperkt winkels', 'Onbeperkt medewerkers', 'Helpdesk en analytics', 'Voorrangssupport'],
            'enterprise' => ['Eigen successmanager', 'Integraties op maat', 'Single sign-on'],
        ],
    ],

    'storefront' => [
        'pages' => 'Over ons',
        'wholesale' => 'Groothandel',
        'support' => 'Support',
        'chat' => 'Chat met ons',
        'wholesale_title' => 'Groothandelsaanvragen',
        'wholesale_intro' => 'Hotels, spa’s, conceptstores en relatiegeschenken: dit formulier is in het paneel gebouwd met de Forms-plugin (twee stappen, een voorwaardelijke vraag, spambeveiliging).',
        'wholesale_unavailable' => 'Groothandelsaanvragen zijn voorlopig gepauzeerd.',
        'support_title' => 'Klantenservice',
        'support_intro' => 'Het klantportaal van de Helpdesk-plugin: open een ticket, volg het gesprek, beoordeel het antwoord.',
        'new_checkout' => 'Nieuw afrekenen (bèta)',
        'cms_intro' => 'Deze pagina wordt beheerd met de CMS-plugin: blokken, concepten, live voorbeeld en een bewerkbalk voor ingelogde medewerkers.',
    ],
];
