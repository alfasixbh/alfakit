<?php

declare(strict_types=1);

return [
    'page' => [
        'title' => 'Applicatiestatus',
        'navigation_label' => 'Status',
        'last_ran' => 'Gecontroleerd :time',
        'never_ran' => 'De controles zijn nog niet uitgevoerd.',
    ],

    'results' => [
        'details' => 'Details',
        'columns' => [
            'check' => 'Controle',
            'status' => 'Status',
            'summary' => 'Samenvatting',
            'message' => 'Bericht',
            'meta' => 'Details',
        ],
        'empty' => [
            'heading' => 'Nog geen resultaten',
            'description' => 'Vernieuw om de statuscontroles uit te voeren.',
        ],
    ],

    'statuses' => [
        'ok' => 'OK',
        'warning' => 'Waarschuwing',
        'failed' => 'Mislukt',
        'crashed' => 'Gecrasht',
        'skipped' => 'Overgeslagen',
        'unknown' => 'Onbekend',
    ],

    'actions' => [
        'refresh' => [
            'label' => 'Vernieuwen',
            'notification' => 'Statuscontroles vernieuwd',
        ],
    ],

    'checks' => [
        'backups' => 'Back-ups',
        'cache' => 'Cache',
        'cpu_load' => 'CPU-belasting',
        'database' => 'Database',
        'database_connection_count' => 'Databaseverbindingen',
        'database_size' => 'Databasegrootte',
        'database_table_size' => 'Grootte van databasetabellen',
        'debug_mode' => 'Debugmodus',
        'environment' => 'Omgeving',
        'flare_error_occurrence_count' => 'Flare-fouten',
        'horizon' => 'Horizon',
        'meilisearch' => 'Meilisearch',
        'optimized_app' => 'Geoptimaliseerde app',
        'ping' => 'Ping',
        'queue' => 'Wachtrij',
        'redis' => 'Redis',
        'redis_memory_usage' => 'Redis-geheugengebruik',
        'schedule' => 'Planner',
        'security_advisories' => 'Beveiligingsadviezen',
        'used_disk_space' => 'Gebruikte schijfruimte',
    ],

    'widget' => [
        'label' => 'Applicatiestatus',
        'ok' => 'Alle controles geslaagd',
        'failing' => '{1} :count mislukte controle|[2,*] :count mislukte controles',
        'warnings' => '{1} :count waarschuwing|[2,*] :count waarschuwingen',
        'never_ran' => 'Nog niet gecontroleerd',
    ],
];
