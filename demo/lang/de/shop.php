<?php

declare(strict_types=1);

/*
 * German storefront strings. Keys match lang/en/shop.php (tests/Feature/ShopTranslationParityTest.php).
 */
return [
    'attributes' => [
        'name' => 'Name',
        'rating' => 'Bewertung',
        'review' => 'Rezension',
    ],

    'locale' => [
        'label' => 'Sprache',
    ],

    'strip' => [
        'eyebrow' => 'Gebaut mit AlfaKit',
        'title' => 'Eine Panel-Definition, drei Frontends.',
        'body' => 'Alles, was Sie hier sehen, wird aus demselben PHP-Schema gerendert. Wechseln Sie den Renderer, und die Seite lädt in React, Vue oder Svelte neu, mit demselben Markup, demselben Styling und demselben Verhalten.',
        'cta' => 'Renderer wechseln',
        'hint' => 'Sie sehen den :renderer-Build.',
        'mascot_alt' => 'Das Fuchs-Maskottchen von AlfaKit',
    ],

    'newsletter' => [
        'heading' => 'Post aus dem Atelier',
        'body' => 'Eine Nachricht, wenn ein neuer Duft erscheint, höchstens zweimal im Monat.',
        'label' => 'E-Mail-Adresse',
        'placeholder' => 'sie@example.com',
        'submit' => 'Abonnieren',
        'duplicate' => 'Diese Adresse steht bereits auf der Liste.',
        'thanks' => [
            'title' => 'Sie stehen auf der Liste',
            'body' => 'Der nächste Brief von Maison Alfa erreicht Sie zuerst.',
        ],
    ],

    'product' => [
        'back' => 'Alle Produkte',
        'by' => 'von :brand',
        'sku' => 'Artikelnummer',
        'gallery' => 'Galerie',
        'image_of' => ':name, Ansicht :index',
        'sizes' => 'Größen',
        'choose_size' => 'Größe wählen',
        'stock' => [
            'in' => 'Auf Lager',
            'low' => 'Nur noch :count verfügbar',
            'out' => 'Ausverkauft',
        ],
        'notes' => [
            'heading' => 'Komposition',
            'top' => 'Kopfnoten',
            'heart' => 'Herznoten',
            'base' => 'Basisnoten',
        ],
        'details' => [
            'heading' => 'Details',
            'concentration' => 'Konzentration',
            'audience' => 'Für',
            'size' => 'Größe',
            'category' => 'Kategorie',
            'tags' => 'Schlagwörter',
        ],
        'enquire' => 'Fragen zu diesem Duft',
        'track' => 'Bestellung verfolgen',
        'reviews' => [
            'heading' => 'Bewertungen',
            'count' => '{0} Noch keine Bewertungen|{1} Eine Bewertung|[2,*] :count Bewertungen',
            'average' => ':average von 5',
            'empty' => 'Noch keine Bewertungen. Erzählen Sie als Erste oder Erster, wie er sich trägt.',
            'verified' => 'Verifizierter Kauf',
            'guest' => 'Gast',
            'write' => 'Bewertung schreiben',
            'write_help' => 'Bewertungen werden vom Team gelesen und im Admin-Panel veröffentlicht, meist innerhalb eines Tages.',
        ],
        'related' => 'Das könnte Ihnen auch gefallen',
        'compare' => 'Statt :price',
        'currency_note' => 'Preise in US-Dollar, inklusive Steuern.',
    ],

    'review' => [
        'fields' => [
            'rating' => 'Ihre Bewertung',
            'name' => 'Ihr Name',
            'email' => 'E-Mail',
            'email_help' => 'Wird nie angezeigt. Wenn Sie diesen Duft bei uns gekauft haben, wird Ihre Bewertung als verifizierter Kauf markiert.',
            'title' => 'Überschrift',
            'body' => 'Ihre Rezension',
        ],
        'submit' => 'Bewertung senden',
        'thanks' => [
            'title' => 'Vielen Dank, :name',
            'body' => 'Ihre Bewertung liegt beim Team und erscheint, sobald sie im Admin-Panel freigegeben wurde.',
        ],
    ],

    'contact' => [
        'heading' => 'Schreiben Sie der Maison',
        'intro' => 'Eine Frage zu einer Bestellung, ein Duft, den Sie nicht finden, Großhandel oder Presse: Das Team in Manama liest jede Nachricht und antwortet innerhalb von zwei Werktagen.',
        'form_heading' => 'Nachricht senden',
        'form_help' => 'Dies ist ein eigenständiges AlfaKit-Formular: Die Validierung läuft auf dem Server, das Thema blendet ein Feld für die Bestellnummer ein, und der Senden-Button ist ratenbegrenzt.',
        'details' => [
            'heading' => 'Die Boutique',
            'email' => 'E-Mail',
            'phone' => 'Telefon',
            'hours' => 'Öffnungszeiten',
            'hours_value' => 'Samstag bis Donnerstag, 10:00 bis 22:00 Uhr',
            'address' => 'Bahrain Bay, Manama',
        ],
        'fields' => [
            'name' => 'Ihr Name',
            'email' => 'E-Mail',
            'topic' => 'Thema',
            'order_number' => 'Bestellnummer',
            'message' => 'Nachricht',
            'message_help' => 'Mindestens 20 Zeichen. Nennen Sie den Duft oder die Bestellung, um die es geht.',
        ],
        'topics' => [
            'order' => 'Eine Bestellung',
            'product' => 'Ein Produkt',
            'wholesale' => 'Großhandel',
            'press' => 'Presse',
            'other' => 'Etwas anderes',
        ],
        'prefill' => 'Ich möchte mehr über :product erfahren.',
        'submit' => 'Nachricht senden',
        'mail_subject' => 'Kontakt Maison Alfa: :topic',
        'thanks' => [
            'title' => 'Vielen Dank, :name',
            'body' => 'Wir antworten an :email innerhalb von zwei Werktagen.',
        ],
        'rate_limited' => 'Sie haben bereits einige Nachrichten gesendet',
    ],

    'track' => [
        'heading' => 'Bestellung verfolgen',
        'intro' => 'Geben Sie die beim Bezahlen verwendete E-Mail-Adresse und die Bestellnummer aus Ihrer Bestätigung ein. Sie sehen alle Bestellungen dieses Kontos und den vollständigen Verlauf der gesuchten Bestellung.',
        'fields' => [
            'email' => 'E-Mail beim Bezahlen',
            'number' => 'Bestellnummer',
            'submit' => 'Meine Bestellung finden',
        ],
        'sample' => [
            'heading' => 'Mit einer echten Bestellung ausprobieren',
            'body' => 'Dies ist ein Demoshop, deshalb hier eine angelegte Bestellung zum Nachschlagen:',
            'use' => 'Diese Bestellung verwenden',
        ],
        'not_found' => [
            'heading' => 'Diese Bestellung wurde nicht gefunden',
            'body' => 'Prüfen Sie E-Mail-Adresse und Bestellnummer oder verwenden Sie die Beispielbestellung unten.',
        ],
        'orders' => [
            'heading' => 'Ihre Bestellungen',
            'description' => 'Alles, was :name bestellt hat. Klicken Sie auf eine Bestellung, um ihren Verlauf zu sehen.',
            'number' => 'Bestellung',
            'placed' => 'Aufgegeben',
            'items' => 'Artikel',
            'status' => 'Status',
            'total' => 'Gesamt',
            'search' => 'Nach Bestellnummer suchen',
        ],
        'timeline' => [
            'heading' => 'Bestellung :number',
            'description' => 'Jeder Schritt, von der Kasse bis an Ihre Tür.',
            'steps' => 'Verlauf',
            'carrier' => 'Versanddienstleister',
            'tracking' => 'Sendungsnummer',
            'ship_to' => 'Lieferung an',
            'no_shipment' => 'Noch nicht versandt',
            'no_tracking' => 'Verfügbar nach dem Versand',
        ],
        'components_note' => 'Die Bestelltabelle und der Verlauf sind eigenständige AlfaKit-Komponenten: eine Table und eine Infolist, gerendert im Shop-Layout.',
    ],
];
