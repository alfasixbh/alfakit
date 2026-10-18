<?php

declare(strict_types=1);

return [
    'page' => [
        'title' => 'Saúde da aplicação',
        'navigation_label' => 'Saúde',
        'last_ran' => 'Verificado :time',
        'never_ran' => 'As verificações ainda não foram executadas.',
    ],

    'results' => [
        'details' => 'Detalhes',
        'columns' => [
            'check' => 'Verificação',
            'status' => 'Status',
            'summary' => 'Resumo',
            'message' => 'Mensagem',
            'meta' => 'Detalhes',
        ],
        'empty' => [
            'heading' => 'Nenhum resultado ainda',
            'description' => 'Atualize para executar as verificações de saúde.',
        ],
    ],

    'statuses' => [
        'ok' => 'OK',
        'warning' => 'Aviso',
        'failed' => 'Falhou',
        'crashed' => 'Travou',
        'skipped' => 'Ignorada',
        'unknown' => 'Desconhecido',
    ],

    'actions' => [
        'refresh' => [
            'label' => 'Atualizar',
            'notification' => 'Verificações de saúde atualizadas',
        ],
    ],

    'checks' => [
        'backups' => 'Backups',
        'cache' => 'Cache',
        'cpu_load' => 'Carga da CPU',
        'database' => 'Banco de dados',
        'database_connection_count' => 'Conexões com o banco de dados',
        'database_size' => 'Tamanho do banco de dados',
        'database_table_size' => 'Tamanho das tabelas',
        'debug_mode' => 'Modo de depuração',
        'environment' => 'Ambiente',
        'flare_error_occurrence_count' => 'Erros do Flare',
        'horizon' => 'Horizon',
        'meilisearch' => 'Meilisearch',
        'optimized_app' => 'Aplicação otimizada',
        'ping' => 'Ping',
        'queue' => 'Fila',
        'redis' => 'Redis',
        'redis_memory_usage' => 'Uso de memória do Redis',
        'schedule' => 'Agendamento',
        'security_advisories' => 'Alertas de segurança',
        'used_disk_space' => 'Espaço em disco usado',
    ],

    'widget' => [
        'label' => 'Saúde da aplicação',
        'ok' => 'Todas as verificações passaram',
        'failing' => '{1} :count verificação com falha|[2,*] :count verificações com falha',
        'warnings' => '{1} :count aviso|[2,*] :count avisos',
        'never_ran' => 'Ainda não verificado',
    ],
];
