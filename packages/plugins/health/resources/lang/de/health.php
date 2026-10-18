<?php

declare(strict_types=1);

return [
    'page' => [
        'title' => 'Anwendungszustand',
        'navigation_label' => 'Zustand',
        'last_ran' => 'Geprüft :time',
        'never_ran' => 'Die Prüfungen wurden noch nicht ausgeführt.',
    ],

    'results' => [
        'details' => 'Details',
        'columns' => [
            'check' => 'Prüfung',
            'status' => 'Status',
            'summary' => 'Zusammenfassung',
            'message' => 'Meldung',
            'meta' => 'Details',
        ],
        'empty' => [
            'heading' => 'Noch keine Ergebnisse',
            'description' => 'Aktualisieren Sie, um die Zustandsprüfungen auszuführen.',
        ],
    ],

    'statuses' => [
        'ok' => 'OK',
        'warning' => 'Warnung',
        'failed' => 'Fehlgeschlagen',
        'crashed' => 'Abgestürzt',
        'skipped' => 'Übersprungen',
        'unknown' => 'Unbekannt',
    ],

    'actions' => [
        'refresh' => [
            'label' => 'Aktualisieren',
            'notification' => 'Zustandsprüfungen aktualisiert',
        ],
    ],

    'checks' => [
        'backups' => 'Backups',
        'cache' => 'Cache',
        'cpu_load' => 'CPU-Last',
        'database' => 'Datenbank',
        'database_connection_count' => 'Datenbankverbindungen',
        'database_size' => 'Datenbankgröße',
        'database_table_size' => 'Größe der Datenbanktabellen',
        'debug_mode' => 'Debug-Modus',
        'environment' => 'Umgebung',
        'flare_error_occurrence_count' => 'Flare-Fehler',
        'horizon' => 'Horizon',
        'meilisearch' => 'Meilisearch',
        'optimized_app' => 'Optimierte App',
        'ping' => 'Ping',
        'queue' => 'Warteschlange',
        'redis' => 'Redis',
        'redis_memory_usage' => 'Redis-Speichernutzung',
        'schedule' => 'Zeitplan',
        'security_advisories' => 'Sicherheitshinweise',
        'used_disk_space' => 'Belegter Speicherplatz',
    ],

    'widget' => [
        'label' => 'Anwendungszustand',
        'ok' => 'Alle Prüfungen bestanden',
        'failing' => '{1} :count fehlgeschlagene Prüfung|[2,*] :count fehlgeschlagene Prüfungen',
        'warnings' => '{1} :count Warnung|[2,*] :count Warnungen',
        'never_ran' => 'Noch nicht geprüft',
    ],
];
