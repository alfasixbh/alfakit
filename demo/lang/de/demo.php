<?php

declare(strict_types=1);

/*
 * German demo strings. Keys must match lang/en/demo.php (tests/Feature/TranslationParityTest.php).
 */
return [
    'brand' => 'Maison Alfa',
    'tagline' => 'Parfum & Lifestyle, kuratiert in Bahrain.',

    'navigation' => [
        'catalog' => 'Katalog',
        'sales' => 'Verkauf',
        'customers' => 'Kunden',
        'marketing' => 'Marketing',
        'reports' => 'Berichte',
        'settings' => 'Einstellungen',
        'showcase' => 'Showcase',
        'support' => 'Support',
        'content' => 'Inhalte',
        'system' => 'System',
    ],

    'switcher' => [
        'label' => 'Renderer',
        'react' => 'React',
        'vue' => 'Vue',
        'svelte' => 'Svelte',
        'current' => ':renderer (aktuell)',
    ],

    'design' => [
        'theme' => 'Design',
        'mobile_preset' => 'Mobile Vorlage',
        'mobile_on' => 'Untere Navigation auf Smartphones',
        'mobile_off' => 'Seitenmenü auf Smartphones',
    ],

    'footer' => [
        'note' => 'AlfaKit-Demo · stündlich zurückgesetzt',
        'docs' => 'Dokumentation',
    ],

    'meta' => [
        'site' => 'AlfaKit-Demo',
        'title' => 'Maison Alfa · die AlfaKit-Demo',
        'panel_title' => 'Maison Alfa Admin · die AlfaKit-Demo',
        'description' => 'Ein fiktiver Parfümladen, gebaut mit AlfaKit: eine einzige Laravel-Admin-Panel-Definition, gerendert mit React, Vue und Svelte. Melden Sie sich mit dem gemeinsamen Demokonto an; alles wird stündlich zurückgesetzt.',
    ],

    'reset' => [
        'in' => 'Zurücksetzen in :minutes Min.',
        'soon' => 'Zurücksetzen in weniger als einer Minute',
        'title' => 'Die Demo-Datenbank und die Uploads werden jede volle Stunde wiederhergestellt.',
    ],

    'profile' => [
        'locked_heading' => 'Dies ist das gemeinsame Demokonto',
        'locked_body' => 'E-Mail-Adresse und Passwort bleiben unverändert, damit sich der nächste Besucher anmelden kann. Den Anzeigenamen können Sie trotzdem ändern.',
        'mfa_heading' => 'Zwei-Faktor-Authentifizierung',
        'mfa_body' => 'Die Einrichtung ist für das gemeinsame Konto deaktiviert. Übernehmen Sie unter Einstellungen › Mitarbeiter die Identität eines Kollegen, um Authenticator-App und E-Mail-Codes auszuprobieren.',
    ],

    'errors' => [
        'back_home' => 'Zurück zum Shop',
        'open_admin' => 'Admin-Panel öffnen',
        '403' => ['title' => 'Nicht für dieses Konto', 'body' => 'Ihre Rolle in diesem Geschäft umfasst diese Seite nicht. Wechseln Sie das Geschäft oder bitten Sie einen Inhaber um Zugriff.'],
        '404' => ['title' => 'Seite nicht gefunden', 'body' => 'Die Seite wurde möglicherweise verschoben oder der Datensatz beim stündlichen Zurücksetzen entfernt.'],
        '419' => ['title' => 'Seite abgelaufen', 'body' => 'Ihre Sitzung ist abgelaufen. Laden Sie die Seite neu und versuchen Sie es erneut.'],
        '429' => ['title' => 'Etwas langsamer, bitte', 'body' => 'Zu viele Anfragen in kurzer Zeit. Warten Sie einen Moment und versuchen Sie es dann erneut.'],
        '500' => ['title' => 'Etwas ist schiefgelaufen', 'body' => 'Der Fehler wurde protokolliert. Versuchen Sie es gleich noch einmal.'],
        '503' => ['title' => 'Gleich wieder da', 'body' => 'Die Demo wird gerade aufgefrischt. Sie ist in einer Minute wieder verfügbar.'],
    ],

    'login' => [
        'about' => 'Maison Alfa ist ein fiktiver Parfümladen, dessen Admin-Panel mit AlfaKit gebaut und von React, Vue oder Svelte gerendert wird.',
        'heading' => 'Demokonto',
        'hint' => 'Melden Sie sich mit :email und dem Passwort :password an. Alle Änderungen werden stündlich zurückgesetzt.',
        'fill' => 'Demokonto verwenden',
    ],

    'storefront' => [
        'title' => 'Maison Alfa',
        'nav' => [
            'home' => 'Startseite',
            'contact' => 'Kontakt',
            'track' => 'Bestellung verfolgen',
            'admin' => 'Admin-Panel öffnen',
        ],
        'hero' => [
            'eyebrow' => 'Der AlfaKit-Demoshop',
            'title' => 'Düfte mit Geschichte, Software mit Rückgrat.',
            'body' => 'Maison Alfa ist ein fiktives Parfümhaus, das zeigt, was AlfaKit rendert: eine Laravel-Anwendung, eine Admin-Panel-Definition, drei Frontends. Stöbern Sie im Shop und öffnen Sie dann dasselbe Panel in React, Vue oder Svelte.',
            'cta' => 'Admin-Panel öffnen',
            'secondary' => 'Dokumentation lesen',
        ],
        'featured' => 'Highlights der Saison',
        'from' => 'Ab :price',
        'notes' => 'Kopf :top · Herz :heart · Basis :base',
        'by' => 'von :brand',
        'empty' => 'Noch keine hervorgehobenen Produkte. Führen Sie php artisan demo:reset aus, um den Shop zu befüllen.',
        'footer' => [
            'beta' => 'AlfaKit Public Beta',
            'built' => 'Gebaut mit AlfaKit von Alfa Six. Fiktiver Shop, echte Software.',
            'renderer' => 'Gerendert mit :renderer',
        ],
    ],

    'product_status' => [
        'draft' => 'Entwurf',
        'active' => 'Aktiv',
        'archived' => 'Archiviert',
    ],
    'order_status' => [
        'pending' => 'Ausstehend',
        'paid' => 'Bezahlt',
        'processing' => 'In Bearbeitung',
        'shipped' => 'Versandt',
        'delivered' => 'Zugestellt',
        'cancelled' => 'Storniert',
        'refunded' => 'Erstattet',
    ],
    'payment_method' => [
        'card' => 'Karte',
        'apple_pay' => 'Apple Pay',
        'paypal' => 'PayPal',
        'bank_transfer' => 'Banküberweisung',
        'cash_on_delivery' => 'Nachnahme',
    ],
    'payment_status' => [
        'pending' => 'Ausstehend',
        'captured' => 'Eingezogen',
        'failed' => 'Fehlgeschlagen',
        'refunded' => 'Erstattet',
    ],
    'shipment_status' => [
        'pending' => 'Ausstehend',
        'in_transit' => 'Unterwegs',
        'delivered' => 'Zugestellt',
        'returned' => 'Retourniert',
    ],
    'review_status' => [
        'pending' => 'Ausstehend',
        'approved' => 'Freigegeben',
        'rejected' => 'Abgelehnt',
    ],
    'discount_type' => [
        'percentage' => 'Prozentsatz',
        'fixed' => 'Fester Betrag',
        'free_shipping' => 'Kostenloser Versand',
    ],
    'staff_role' => [
        'owner' => 'Inhaber',
        'manager' => 'Manager',
        'staff' => 'Mitarbeiter',
    ],
    'concentration' => [
        'extrait' => 'Extrait de Parfum',
        'parfum' => 'Parfum',
        'eau_de_parfum' => 'Eau de Parfum',
        'eau_de_toilette' => 'Eau de Toilette',
        'body_mist' => 'Body Mist',
        'candle' => 'Duftkerze',
        'diffuser' => 'Raumduft mit Stäbchen',
    ],
    'audience' => [
        'unisex' => 'Unisex',
        'women' => 'Damen',
        'men' => 'Herren',
    ],

    'timeline' => [
        'placed' => 'Bestellung aufgegeben',
        'paid' => 'Zahlung eingezogen',
        'processing' => 'Kommissioniert und verpackt',
        'shipped' => 'An :carrier übergeben',
        'delivered' => 'Zugestellt',
        'cancelled' => 'Vom Kunden storniert',
        'refunded' => 'Erstattung veranlasst',
    ],
];
