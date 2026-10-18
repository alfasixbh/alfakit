<?php

declare(strict_types=1);

return [
    'page' => [
        'title' => 'Estado de la aplicación',
        'navigation_label' => 'Estado',
        'last_ran' => 'Comprobado :time',
        'never_ran' => 'Las comprobaciones aún no se han ejecutado.',
    ],

    'results' => [
        'details' => 'Detalles',
        'columns' => [
            'check' => 'Comprobación',
            'status' => 'Estado',
            'summary' => 'Resumen',
            'message' => 'Mensaje',
            'meta' => 'Detalles',
        ],
        'empty' => [
            'heading' => 'Aún no hay resultados',
            'description' => 'Actualice para ejecutar las comprobaciones de estado.',
        ],
    ],

    'statuses' => [
        'ok' => 'OK',
        'warning' => 'Advertencia',
        'failed' => 'Fallida',
        'crashed' => 'Bloqueada',
        'skipped' => 'Omitida',
        'unknown' => 'Desconocido',
    ],

    'actions' => [
        'refresh' => [
            'label' => 'Actualizar',
            'notification' => 'Comprobaciones de estado actualizadas',
        ],
    ],

    'checks' => [
        'backups' => 'Copias de seguridad',
        'cache' => 'Caché',
        'cpu_load' => 'Carga de CPU',
        'database' => 'Base de datos',
        'database_connection_count' => 'Conexiones a la base de datos',
        'database_size' => 'Tamaño de la base de datos',
        'database_table_size' => 'Tamaño de las tablas',
        'debug_mode' => 'Modo de depuración',
        'environment' => 'Entorno',
        'flare_error_occurrence_count' => 'Errores de Flare',
        'horizon' => 'Horizon',
        'meilisearch' => 'Meilisearch',
        'optimized_app' => 'Aplicación optimizada',
        'ping' => 'Ping',
        'queue' => 'Cola',
        'redis' => 'Redis',
        'redis_memory_usage' => 'Uso de memoria de Redis',
        'schedule' => 'Programador',
        'security_advisories' => 'Avisos de seguridad',
        'used_disk_space' => 'Espacio en disco usado',
    ],

    'widget' => [
        'label' => 'Estado de la aplicación',
        'ok' => 'Todas las comprobaciones son correctas',
        'failing' => '{1} :count comprobación fallida|[2,*] :count comprobaciones fallidas',
        'warnings' => '{1} :count advertencia|[2,*] :count advertencias',
        'never_ran' => 'Aún sin comprobar',
    ],
];
