<?php

declare(strict_types=1);

return [
    'page' => [
        'title' => 'Stato dell’applicazione',
        'navigation_label' => 'Stato',
        'last_ran' => 'Controllato :time',
        'never_ran' => 'I controlli non sono ancora stati eseguiti.',
    ],

    'results' => [
        'details' => 'Dettagli',
        'columns' => [
            'check' => 'Controllo',
            'status' => 'Stato',
            'summary' => 'Riepilogo',
            'message' => 'Messaggio',
            'meta' => 'Dettagli',
        ],
        'empty' => [
            'heading' => 'Ancora nessun risultato',
            'description' => 'Aggiorna per eseguire i controlli di stato.',
        ],
    ],

    'statuses' => [
        'ok' => 'OK',
        'warning' => 'Avviso',
        'failed' => 'Non riuscito',
        'crashed' => 'Arrestato',
        'skipped' => 'Saltato',
        'unknown' => 'Sconosciuto',
    ],

    'actions' => [
        'refresh' => [
            'label' => 'Aggiorna',
            'notification' => 'Controlli di stato aggiornati',
        ],
    ],

    'checks' => [
        'backups' => 'Backup',
        'cache' => 'Cache',
        'cpu_load' => 'Carico CPU',
        'database' => 'Database',
        'database_connection_count' => 'Connessioni al database',
        'database_size' => 'Dimensione del database',
        'database_table_size' => 'Dimensione delle tabelle',
        'debug_mode' => 'Modalità debug',
        'environment' => 'Ambiente',
        'flare_error_occurrence_count' => 'Errori Flare',
        'horizon' => 'Horizon',
        'meilisearch' => 'Meilisearch',
        'optimized_app' => 'App ottimizzata',
        'ping' => 'Ping',
        'queue' => 'Coda',
        'redis' => 'Redis',
        'redis_memory_usage' => 'Memoria usata da Redis',
        'schedule' => 'Pianificazione',
        'security_advisories' => 'Avvisi di sicurezza',
        'used_disk_space' => 'Spazio su disco usato',
    ],

    'widget' => [
        'label' => 'Stato dell’applicazione',
        'ok' => 'Tutti i controlli superati',
        'failing' => '{1} :count controllo non riuscito|[2,*] :count controlli non riusciti',
        'warnings' => '{1} :count avviso|[2,*] :count avvisi',
        'never_ran' => 'Non ancora controllato',
    ],
];
