<?php

declare(strict_types=1);

return [
    'page' => [
        'title' => 'État de l’application',
        'navigation_label' => 'État',
        'last_ran' => 'Vérifié :time',
        'never_ran' => 'Les vérifications n’ont pas encore été exécutées.',
    ],

    'results' => [
        'details' => 'Détails',
        'columns' => [
            'check' => 'Vérification',
            'status' => 'Statut',
            'summary' => 'Résumé',
            'message' => 'Message',
            'meta' => 'Détails',
        ],
        'empty' => [
            'heading' => 'Aucun résultat pour le moment',
            'description' => 'Actualisez pour lancer les vérifications.',
        ],
    ],

    'statuses' => [
        'ok' => 'OK',
        'warning' => 'Avertissement',
        'failed' => 'Échec',
        'crashed' => 'Plantage',
        'skipped' => 'Ignoré',
        'unknown' => 'Inconnu',
    ],

    'actions' => [
        'refresh' => [
            'label' => 'Actualiser',
            'notification' => 'Vérifications actualisées',
        ],
    ],

    'checks' => [
        'backups' => 'Sauvegardes',
        'cache' => 'Cache',
        'cpu_load' => 'Charge CPU',
        'database' => 'Base de données',
        'database_connection_count' => 'Connexions à la base de données',
        'database_size' => 'Taille de la base de données',
        'database_table_size' => 'Taille des tables',
        'debug_mode' => 'Mode débogage',
        'environment' => 'Environnement',
        'flare_error_occurrence_count' => 'Erreurs Flare',
        'horizon' => 'Horizon',
        'meilisearch' => 'Meilisearch',
        'optimized_app' => 'Application optimisée',
        'ping' => 'Ping',
        'queue' => 'File d’attente',
        'redis' => 'Redis',
        'redis_memory_usage' => 'Mémoire utilisée par Redis',
        'schedule' => 'Planificateur',
        'security_advisories' => 'Avis de sécurité',
        'used_disk_space' => 'Espace disque utilisé',
    ],

    'widget' => [
        'label' => 'État de l’application',
        'ok' => 'Toutes les vérifications ont réussi',
        'failing' => '{1} :count vérification en échec|[2,*] :count vérifications en échec',
        'warnings' => '{1} :count avertissement|[2,*] :count avertissements',
        'never_ran' => 'Pas encore vérifié',
    ],
];
