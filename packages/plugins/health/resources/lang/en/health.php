<?php

declare(strict_types=1);

return [
    'page' => [
        'title' => 'Application health',
        'navigation_label' => 'Health',
        'last_ran' => 'Checked :time',
        'never_ran' => 'The checks have not run yet.',
    ],

    'results' => [
        'details' => 'Details',
        'columns' => [
            'check' => 'Check',
            'status' => 'Status',
            'summary' => 'Summary',
            'message' => 'Message',
            'meta' => 'Details',
        ],
        'empty' => [
            'heading' => 'No results yet',
            'description' => 'Refresh to run the health checks.',
        ],
    ],

    'statuses' => [
        'ok' => 'OK',
        'warning' => 'Warning',
        'failed' => 'Failed',
        'crashed' => 'Crashed',
        'skipped' => 'Skipped',
        'unknown' => 'Unknown',
    ],

    'actions' => [
        'refresh' => [
            'label' => 'Refresh',
            'notification' => 'Health checks refreshed',
        ],
    ],

    'checks' => [
        'backups' => 'Backups',
        'cache' => 'Cache',
        'cpu_load' => 'CPU load',
        'database' => 'Database',
        'database_connection_count' => 'Database connections',
        'database_size' => 'Database size',
        'database_table_size' => 'Database table size',
        'debug_mode' => 'Debug mode',
        'environment' => 'Environment',
        'flare_error_occurrence_count' => 'Flare errors',
        'horizon' => 'Horizon',
        'meilisearch' => 'Meilisearch',
        'optimized_app' => 'Optimized app',
        'ping' => 'Ping',
        'queue' => 'Queue',
        'redis' => 'Redis',
        'redis_memory_usage' => 'Redis memory usage',
        'schedule' => 'Schedule',
        'security_advisories' => 'Security advisories',
        'used_disk_space' => 'Used disk space',
    ],

    'widget' => [
        'label' => 'Application health',
        'ok' => 'All checks passed',
        'failing' => '{1} :count failing check|[2,*] :count failing checks',
        'warnings' => '{1} :count warning|[2,*] :count warnings',
        'never_ran' => 'Not checked yet',
    ],
];
