<?php

declare(strict_types=1);

/*
 * German strings of the first-party plugin integration. Keys match lang/en/plugins.php.
 */
return [
    'commands' => [
        'group' => 'Maison Alfa',
        'order_board' => 'Bestell-Board öffnen',
        'calendar' => 'Kalender des Geschäfts öffnen',
        'returns' => 'Retouren prüfen',
        'category_tree' => 'Kategoriebaum ordnen',
        'new_product' => 'Produkt hinzufügen',
        'storefront' => 'Shop öffnen',
    ],

    'board' => [
        'title' => 'Bestell-Board',
        'subheading' => 'Ziehen Sie Bestellungen durch den Fulfillment-Ablauf oder verschieben Sie sie mit der Tastatur (Leertaste, Pfeiltasten, Leertaste). Die letzten 60 Tage.',
        'open' => 'Board',
        'timeline_note' => 'Von :user auf dem Bestell-Board verschoben',
    ],

    'calendar' => [
        'title' => 'Kalender',
        'subheading' => 'Aktionen, Sendungen, Zustellungen und geplante Seiten dieses Geschäfts.',
        'this_week' => 'Diese Woche',
        'new_promotion' => 'Aktion planen',
        'hint' => 'Ziehen Sie eine Aktion, um sie zu verschieben, ziehen Sie ihr Ende, um die Laufzeit zu ändern, klicken Sie zum Bearbeiten, oder markieren Sie Tage, um eine neue zu planen.',
        'fields' => [
            'value' => 'Wert (% oder Betrag)',
        ],
        'legend' => [
            'label' => 'Legende',
            'percentage' => 'Aktion: Prozentrabatt',
            'fixed' => 'Aktion: Betragsrabatt',
            'free_shipping' => 'Aktion: kostenloser Versand',
            'shipped' => 'Sendung hat die Boutique verlassen',
            'delivered' => 'Zugestellt',
            'publish' => 'Geplante Seite',
        ],
        'events' => [
            'shipped' => ':number versandt (:carrier)',
            'delivered' => ':number zugestellt',
            'publish' => 'Veröffentlichen: :title',
        ],
    ],

    'returns' => [
        'label' => 'Retoure',
        'plural' => 'Retouren',
        'workflow' => 'Retourenfreigabe',
        'subheading' => 'Der Support legt eine Retoure zu einer Bestellung an und reicht sie ein; ein Inhaber oder Manager gibt sie unter Freigaben frei; freigegebene Retouren werden erstattet.',
        'empty' => 'Noch keine Retouren',
        'request' => 'Retoure anfordern',
        'request_heading' => 'Retoure für Bestellung :number',
        'created' => 'Retoure :number angelegt. Reichen Sie sie zur Freigabe ein, wenn sie vollständig ist.',
        'timeline_note' => 'Erstattet über Retoure :number',
        'states' => [
            'requested' => 'Angefordert',
            'awaiting_approval' => 'Wartet auf Freigabe',
            'approved' => 'Freigegeben',
            'rejected' => 'Abgelehnt',
            'refunded' => 'Erstattet',
            'closed' => 'Geschlossen',
        ],
        'transitions' => [
            'submit' => 'Zur Freigabe einreichen',
            'refund' => 'Erstatten',
            'reopen' => 'Wieder öffnen',
            'close' => 'Schließen',
        ],
        'steps' => [
            'manager' => 'Freigabe durch Manager',
        ],
        'reasons' => [
            'damaged' => 'Beim Transport beschädigt',
            'wrong_item' => 'Falscher Artikel',
            'not_as_described' => 'Nicht wie beschrieben',
            'allergy' => 'Hautreaktion',
            'changed_mind' => 'Meinung geändert',
        ],
        'fields' => [
            'number' => 'Retoure',
            'state' => 'Zustand',
            'reason' => 'Grund',
            'amount' => 'Erstattungsbetrag',
            'details' => 'Details',
            'requested_by' => 'Angelegt von',
            'refund_reference' => 'Erstattungsreferenz',
        ],
        'sections' => [
            'workflow' => 'Workflow',
            'history' => 'Verlauf',
            'details' => 'Retoure',
        ],
    ],

    'invoices' => [
        'issue' => 'Rechnung ausstellen',
        'open' => 'Rechnung öffnen',
        'issue_description' => 'Erstellt eine Rechnung aus den Bestellpositionen, mit MwSt. nach den Steuersätzen des Geschäfts.',
        'notes' => 'Rechnung zu Bestellung :number. Vielen Dank für Ihren Einkauf bei Maison Alfa.',
        'terms' => 'Zahlbar innerhalb von 14 Tagen. Musterdokument der AlfaKit-Demo.',
    ],

    'comments' => [
        'section' => 'Interne Kommentare',
        'section_description' => 'Nur für Mitarbeiter sichtbar. Tippen Sie @, um eine Kollegin oder einen Kollegen zu erwähnen; sie werden über die Glocke benachrichtigt.',
    ],

    'activity' => [
        'section' => 'Prüfprotokoll',
    ],

    'helpdesk' => [
        'greeting' => 'Hallo! Fragen Sie uns alles zu unseren Düften oder Ihrer Bestellung.',
    ],

    'tree' => [
        'title' => 'Kategoriebaum',
        'subheading' => 'Ziehen Sie Kategorien, um sie zu verschachteln oder neu zu ordnen (oder nutzen Sie die Pfeiltasten), und speichern Sie dann. Kategorien gelten für alle Geschäfte.',
        'open' => 'Baumansicht',
    ],

    'tags' => [
        'segments' => 'Segmente',
    ],

    'media' => [
        'gallery' => 'Lifestyle-Galerie',
        'gallery_description' => 'Zusätzliche Bilder in der Mediathek (getrennt von den Produktbildern oben).',
    ],

    'views' => [
        'low_stock' => 'Geringer Bestand',
        'featured' => 'Hervorgehoben',
        'drafts' => 'Entwürfe',
    ],

    'ai' => [
        'summarise_reviews' => 'Bewertungen zusammenfassen',
        'summarise_heading' => 'Was Kunden über :name sagen',
        'summarise_prompt' => 'Fasse diese Kundenbewertungen des Parfums „:name“ in drei kurzen Stichpunkten zusammen: was sie lieben, was sie kritisieren und zu wem es passt.',
    ],

    'settings' => [
        'title' => 'Einstellungen des Hauses',
        'subheading' => 'Gemeinsam für alle Geschäfte von Maison Alfa. Der Shop zeigt die Ankündigung an.',
        'sections' => [
            'brand' => 'Haus und Shop',
            'notifications' => 'Benachrichtigungen',
        ],
        'fields' => [
            'house_name' => 'Name des Hauses',
            'announcement' => 'Ankündigung im Shop',
            'announcement_help' => 'Wird oben auf jeder Shopseite angezeigt. Leer lassen, um sie auszublenden.',
            'support_hours' => 'Supportzeiten',
            'price_display' => 'Preise im Shop',
            'low_stock_alerts' => 'Warnungen bei geringem Bestand',
            'weekly_report' => 'Wöchentlicher Verkaufsbericht',
            'report_recipients' => 'Empfänger des Berichts',
            'report_recipients_help' => 'E-Mail-Adressen (die Demo schreibt E-Mails nur ins Log).',
        ],
        'price_display' => [
            'tax_inclusive' => 'Inklusive MwSt.',
            'tax_exclusive' => 'Ohne MwSt.',
        ],
    ],

    'backups' => [
        'read_only' => 'In der öffentlichen Demo schreibgeschützt: Erstellen, Herunterladen und Löschen von Backups ist deaktiviert. Die Demo-Datenbank wird jede Stunde neu aufgebaut.',
    ],

    'billing' => [
        'compare_plans' => 'Tarife vergleichen',
        'compare_plans_body' => 'Die Tarifseite des Billing-Plugins listet jeden Tarif mit seinen Funktionen auf. In der Demo wird nie eine Zahlung eingezogen.',
        'see_plans' => 'Tarife ansehen',
        'checkout_disabled' => 'Der Checkout ist in der öffentlichen Demo deaktiviert',
        'checkout_disabled_body' => 'Sie haben den Tarif :plan gewählt. Ein echter Shop würde jetzt Stripe Checkout öffnen; die Demo kontaktiert nie einen Zahlungsanbieter.',
        'contact' => 'Sprechen Sie mit uns',
        'plans' => [
            'boutique' => 'Eine Boutique und ihr Onlineshop.',
            'maison' => 'Mehrere Boutiquen mit gemeinsamem Katalog und Berichten.',
            'enterprise' => 'Franchises, individuelle Integrationen und SSO.',
        ],
        'features' => [
            'boutique' => ['1 Geschäft', '5 Mitarbeiterkonten', 'E-Mail-Support'],
            'maison' => ['Unbegrenzte Geschäfte', 'Unbegrenzte Mitarbeiter', 'Helpdesk und Analysen', 'Bevorzugter Support'],
            'enterprise' => ['Eigener Success Manager', 'Individuelle Integrationen', 'Single Sign-on'],
        ],
    ],

    'storefront' => [
        'pages' => 'Über uns',
        'wholesale' => 'Großhandel',
        'support' => 'Support',
        'chat' => 'Chatten Sie mit uns',
        'wholesale_title' => 'Großhandelsanfragen',
        'wholesale_intro' => 'Hotels, Spas, Concept Stores und Firmengeschenke: Dieses Formular wird im Panel mit dem Forms-Plugin gebaut (zwei Schritte, eine bedingte Frage, Spamschutz).',
        'wholesale_unavailable' => 'Großhandelsanfragen sind derzeit pausiert.',
        'support_title' => 'Kundenservice',
        'support_intro' => 'Das Kundenportal des Helpdesk-Plugins: Ticket eröffnen, Unterhaltung verfolgen, Antwort bewerten.',
        'new_checkout' => 'Neuer Checkout (Beta)',
        'cms_intro' => 'Diese Seite wird mit dem CMS-Plugin verwaltet: Blöcke, Entwürfe, Live-Vorschau und eine Bearbeitungsleiste für angemeldete Mitarbeiter.',
    ],
];
