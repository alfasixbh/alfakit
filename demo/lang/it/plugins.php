<?php

declare(strict_types=1);

/*
 * Italian strings of the first-party plugin integration. Keys match lang/en/plugins.php.
 */
return [
    'commands' => [
        'group' => 'Maison Alfa',
        'order_board' => 'Apri la bacheca ordini',
        'calendar' => 'Apri il calendario del negozio',
        'returns' => 'Esamina i resi',
        'category_tree' => 'Organizza l’albero delle categorie',
        'new_product' => 'Aggiungi un prodotto',
        'storefront' => 'Apri il negozio online',
    ],

    'board' => [
        'title' => 'Bacheca ordini',
        'subheading' => 'Trascina gli ordini lungo il flusso di evasione, oppure spostali con la tastiera (Spazio, frecce, Spazio). Gli ultimi 60 giorni.',
        'open' => 'Bacheca',
        'timeline_note' => 'Spostato sulla bacheca ordini da :user',
    ],

    'calendar' => [
        'title' => 'Calendario',
        'subheading' => 'Promozioni, spedizioni, consegne e pagine programmate di questo negozio.',
        'this_week' => 'Questa settimana',
        'new_promotion' => 'Pianifica una promozione',
        'hint' => 'Trascina una promozione per spostarla, trascinane la fine per cambiarne la durata, fai clic per modificarla, seleziona dei giorni per pianificarne una nuova.',
        'fields' => [
            'value' => 'Valore (% o importo)',
        ],
        'legend' => [
            'label' => 'Legenda',
            'percentage' => 'Promozione: sconto percentuale',
            'fixed' => 'Promozione: sconto a importo',
            'free_shipping' => 'Promozione: spedizione gratuita',
            'shipped' => 'La spedizione ha lasciato la boutique',
            'delivered' => 'Consegnato',
            'publish' => 'Pagina programmata',
        ],
        'events' => [
            'shipped' => ':number spedito (:carrier)',
            'delivered' => ':number consegnato',
            'publish' => 'Pubblicazione: :title',
        ],
    ],

    'returns' => [
        'label' => 'reso',
        'plural' => 'Resi',
        'workflow' => 'Approvazione dei resi',
        'subheading' => 'L’assistenza apre un reso da un ordine e lo invia; un titolare o un responsabile lo approva da Approvazioni; i resi approvati vengono rimborsati.',
        'empty' => 'Ancora nessun reso',
        'request' => 'Richiedi un reso',
        'request_heading' => 'Reso per l’ordine :number',
        'created' => 'Reso :number aperto. Invialo per l’approvazione quando è completo.',
        'timeline_note' => 'Rimborsato tramite il reso :number',
        'states' => [
            'requested' => 'Richiesto',
            'awaiting_approval' => 'In attesa di approvazione',
            'approved' => 'Approvato',
            'rejected' => 'Rifiutato',
            'refunded' => 'Rimborsato',
            'closed' => 'Chiuso',
        ],
        'transitions' => [
            'submit' => 'Invia per l’approvazione',
            'refund' => 'Rimborsa',
            'reopen' => 'Riapri',
            'close' => 'Chiudi',
        ],
        'steps' => [
            'manager' => 'Approvazione del responsabile',
        ],
        'reasons' => [
            'damaged' => 'Danneggiato durante il trasporto',
            'wrong_item' => 'Articolo errato',
            'not_as_described' => 'Non conforme alla descrizione',
            'allergy' => 'Reazione cutanea',
            'changed_mind' => 'Ripensamento',
        ],
        'fields' => [
            'number' => 'Reso',
            'state' => 'Stato',
            'reason' => 'Motivo',
            'amount' => 'Importo del rimborso',
            'details' => 'Dettagli',
            'requested_by' => 'Aperto da',
            'refund_reference' => 'Riferimento del rimborso',
        ],
        'sections' => [
            'workflow' => 'Flusso di lavoro',
            'history' => 'Cronologia',
            'details' => 'Reso',
        ],
    ],

    'invoices' => [
        'issue' => 'Emetti fattura',
        'open' => 'Apri fattura',
        'issue_description' => 'Crea una fattura dalle righe dell’ordine, con l’IVA secondo le aliquote del negozio.',
        'notes' => 'Fattura per l’ordine :number. Grazie per aver acquistato da Maison Alfa.',
        'terms' => 'Pagamento entro 14 giorni. Documento di esempio della demo di AlfaKit.',
    ],

    'comments' => [
        'section' => 'Commenti interni',
        'section_description' => 'Visibili solo al personale. Digita @ per menzionare un collega; riceverà una notifica nella campanella.',
    ],

    'activity' => [
        'section' => 'Registro di controllo',
    ],

    'helpdesk' => [
        'greeting' => 'Ciao! Chiedici qualsiasi cosa sulle nostre fragranze o sul tuo ordine.',
    ],

    'tree' => [
        'title' => 'Albero delle categorie',
        'subheading' => 'Trascina le categorie per annidarle o riordinarle (oppure usa i pulsanti freccia), poi salva. Le categorie sono condivise da tutti i negozi.',
        'open' => 'Vista ad albero',
    ],

    'tags' => [
        'segments' => 'Segmenti',
    ],

    'media' => [
        'gallery' => 'Galleria lifestyle',
        'gallery_description' => 'Immagini aggiuntive salvate nella libreria multimediale (separate dalle immagini del prodotto qui sopra).',
    ],

    'views' => [
        'low_stock' => 'Scorte basse',
        'featured' => 'In evidenza',
        'drafts' => 'Bozze',
    ],

    'ai' => [
        'summarise_reviews' => 'Riassumi le recensioni',
        'summarise_heading' => 'Cosa dicono i clienti di :name',
        'summarise_prompt' => 'Riassumi queste recensioni dei clienti sul profumo «:name» in tre brevi punti elenco: cosa amano, cosa criticano e a chi è adatto.',
    ],

    'settings' => [
        'title' => 'Impostazioni della maison',
        'subheading' => 'Condivise da tutti i negozi di Maison Alfa. Il negozio online mostra l’annuncio.',
        'sections' => [
            'brand' => 'Maison e negozio online',
            'notifications' => 'Notifiche',
        ],
        'fields' => [
            'house_name' => 'Nome della maison',
            'announcement' => 'Annuncio del negozio online',
            'announcement_help' => 'Mostrato in cima a ogni pagina del negozio. Lascia vuoto per nasconderlo.',
            'support_hours' => 'Orari dell’assistenza',
            'price_display' => 'Prezzi nel negozio online',
            'low_stock_alerts' => 'Avvisi di scorte basse',
            'weekly_report' => 'Report settimanale delle vendite',
            'report_recipients' => 'Destinatari del report',
            'report_recipients_help' => 'Indirizzi e-mail (la demo scrive le e-mail solo nel log).',
        ],
        'price_display' => [
            'tax_inclusive' => 'IVA inclusa',
            'tax_exclusive' => 'IVA esclusa',
        ],
    ],

    'backups' => [
        'read_only' => 'Sola lettura nella demo pubblica: la creazione, il download e l’eliminazione dei backup sono disattivati. Il database della demo viene ricostruito ogni ora.',
    ],

    'billing' => [
        'compare_plans' => 'Confronta i piani',
        'compare_plans_body' => 'La pagina dei piani del plugin Billing elenca ogni piano con le sue funzionalità. Nella demo non viene mai addebitato alcun pagamento.',
        'see_plans' => 'Vedi i piani',
        'checkout_disabled' => 'Il checkout è disattivato nella demo pubblica',
        'checkout_disabled_body' => 'Hai scelto il piano :plan. Un negozio reale aprirebbe ora Stripe Checkout; la demo non contatta mai un fornitore di pagamenti.',
        'contact' => 'Parla con noi',
        'plans' => [
            'boutique' => 'Una boutique e il suo negozio online.',
            'maison' => 'Più boutique con catalogo e report condivisi.',
            'enterprise' => 'Franchising, integrazioni personalizzate e SSO.',
        ],
        'features' => [
            'boutique' => ['1 negozio', '5 account per il personale', 'Assistenza via e-mail'],
            'maison' => ['Negozi illimitati', 'Personale illimitato', 'Helpdesk e statistiche', 'Assistenza prioritaria'],
            'enterprise' => ['Success manager dedicato', 'Integrazioni personalizzate', 'Single sign-on'],
        ],
    ],

    'storefront' => [
        'pages' => 'Chi siamo',
        'wholesale' => 'Ingrosso',
        'support' => 'Assistenza',
        'chat' => 'Chatta con noi',
        'wholesale_title' => 'Richieste per l’ingrosso',
        'wholesale_intro' => 'Hotel, spa, concept store e regali aziendali: questo modulo è creato nel pannello con il plugin Forms (due passaggi, una domanda condizionale, protezione antispam).',
        'wholesale_unavailable' => 'Le richieste per l’ingrosso sono sospese per ora.',
        'support_title' => 'Servizio clienti',
        'support_intro' => 'Il portale clienti del plugin Helpdesk: apri un ticket, segui la conversazione, valuta la risposta.',
        'new_checkout' => 'Nuovo checkout (beta)',
        'cms_intro' => 'Questa pagina è gestita con il plugin CMS: blocchi, bozze, anteprima dal vivo e una barra di modifica per il personale che ha effettuato l’accesso.',
    ],
];
