<?php

declare(strict_types=1);

return [
    'dashboard' => [
        'title' => 'Dashboard',
        'customize' => [
            'span' => '{1} :count Spalte|[2,*] :count Spalten',
            'span_full' => 'Volle Breite',
            'invalid' => 'Dieses Dashboard-Layout ist ungültig.',
        ],
    ],
    'global_search' => [
        'placeholder' => 'Suchen…',
        'no_results' => 'Keine Ergebnisse gefunden.',
    ],
    'resources' => [
        'list' => 'Liste',
        'create' => [
            'title' => ':label erstellen',
            'breadcrumb' => 'Erstellen',
        ],
        'edit' => [
            'title' => ':label bearbeiten',
            'breadcrumb' => 'Bearbeiten',
        ],
        'view' => [
            'title' => ':label anzeigen',
            'breadcrumb' => 'Anzeigen',
        ],
        'api' => [
            'failed' => 'Die Anfrage ist fehlgeschlagen',
            'unreachable' => 'Die Datenquelle ist nicht erreichbar. Bitte versuchen Sie es erneut.',
            'error' => 'Die Datenquelle hat mit einem Fehler geantwortet (:status). Bitte versuchen Sie es erneut.',
            'invalid' => 'Die Datenquelle hat die Daten abgelehnt.',
        ],
    ],
    'tenancy' => [
        'switch' => 'Team wechseln',
        'register' => 'Neues Team',
        'profile' => 'Team-Einstellungen',
    ],
    'errors' => [
        'default' => [
            'title' => 'Etwas ist schiefgelaufen',
            'body' => 'Die Anfrage konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.',
        ],
        403 => [
            'title' => 'Zugriff verweigert',
            'body' => 'Dazu sind Sie nicht berechtigt.',
        ],
        404 => [
            'title' => 'Nicht gefunden',
            'body' => 'Die gesuchte Seite oder der gesuchte Datensatz existiert nicht.',
        ],
    ],
    'command_palette' => [
        'placeholder' => 'Befehl eingeben oder suchen…',
        'create' => ':label erstellen',
    ],
    'realtime' => [
        'conflict' => [
            'refused_title' => 'Nicht gespeichert: Der Datensatz wurde geändert',
            'refused_body' => 'Jemand anderes hat diesen Datensatz gespeichert, nachdem Sie ihn geöffnet haben. Prüfen Sie die Änderungen und speichern Sie erneut oder behalten Sie Ihre.',
            'yes' => 'Ja',
            'no' => 'Nein',
        ],
    ],
    'themes' => [
        'neutral' => [
            'label' => 'Neutral',
            'description' => 'Der Klassiker: eingerückter Inhalt neben einer Seitenleiste, schlichte Kopfzeilen und umrandete Karten.',
        ],
        'alfakit' => [
            'label' => 'AlfaKit',
            'description' => 'Das charakteristische Design der Marke AlfaKit: Alfa Navy und Fox Orange auf warmem Creme, Titel in Montserrat und Text in Inter, eine schwebende Seitenleiste mit Pill-Navigation, ein Hero-Banner auf jeder Seite, erhöhte Karten, gefüllte Eingabefelder und Pill-Buttons.',
        ],
        'minimal' => [
            'label' => 'Minimal',
            'description' => 'Keine Seitenleiste: Die Navigation verläuft oben als unterstrichene Tabs. Flache Flächen mit Haarlinien, unterstrichene Eingabefelder, eckige Buttons, kompakt.',
        ],
        'soft' => [
            'label' => 'Soft',
            'description' => 'Eine schmale Symbolleiste, große Serifentitel, getönte randlose Karten, gefüllte abgerundete Eingabefelder und gestreifte Tabellen.',
        ],
        'corporate' => [
            'label' => 'Corporate',
            'description' => 'Marineblaue Seitenleiste mit Akzentbalken-Navigation, ein Titelband über die volle Breite, eckige umrandete Flächen und dichte gestreifte Tabellen.',
        ],
        'filament' => [
            'label' => 'Filament-Stil',
            'description' => 'Graue Fläche, transparente Seitenleiste, weiße umrandete Karten, bernsteinfarbene Akzente und Inter, wie FilamentPHP.',
        ],
    ],
    'pwa' => [
        'offline' => [
            'title' => 'Offline',
            'heading' => 'Du bist offline',
            'body' => 'Prüfe deine Verbindung. Die Seite lädt automatisch neu, sobald du wieder online bist.',
            'retry' => 'Erneut versuchen',
        ],
    ],
];
