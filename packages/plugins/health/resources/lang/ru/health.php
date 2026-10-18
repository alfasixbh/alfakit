<?php

declare(strict_types=1);

return [
    'page' => [
        'title' => 'Состояние приложения',
        'navigation_label' => 'Состояние',
        'last_ran' => 'Проверено :time',
        'never_ran' => 'Проверки ещё не запускались.',
    ],

    'results' => [
        'details' => 'Подробности',
        'columns' => [
            'check' => 'Проверка',
            'status' => 'Статус',
            'summary' => 'Сводка',
            'message' => 'Сообщение',
            'meta' => 'Подробности',
        ],
        'empty' => [
            'heading' => 'Результатов пока нет',
            'description' => 'Обновите, чтобы запустить проверки состояния.',
        ],
    ],

    'statuses' => [
        'ok' => 'OK',
        'warning' => 'Предупреждение',
        'failed' => 'Не пройдена',
        'crashed' => 'Сбой',
        'skipped' => 'Пропущена',
        'unknown' => 'Неизвестно',
    ],

    'actions' => [
        'refresh' => [
            'label' => 'Обновить',
            'notification' => 'Проверки состояния обновлены',
        ],
    ],

    'checks' => [
        'backups' => 'Резервные копии',
        'cache' => 'Кеш',
        'cpu_load' => 'Нагрузка на ЦП',
        'database' => 'База данных',
        'database_connection_count' => 'Подключения к базе данных',
        'database_size' => 'Размер базы данных',
        'database_table_size' => 'Размер таблиц',
        'debug_mode' => 'Режим отладки',
        'environment' => 'Окружение',
        'flare_error_occurrence_count' => 'Ошибки Flare',
        'horizon' => 'Horizon',
        'meilisearch' => 'Meilisearch',
        'optimized_app' => 'Оптимизация приложения',
        'ping' => 'Пинг',
        'queue' => 'Очередь',
        'redis' => 'Redis',
        'redis_memory_usage' => 'Память Redis',
        'schedule' => 'Планировщик',
        'security_advisories' => 'Уведомления безопасности',
        'used_disk_space' => 'Занятое место на диске',
    ],

    'widget' => [
        'label' => 'Состояние приложения',
        'ok' => 'Все проверки пройдены',
        'failing' => '{1} :count проверка не пройдена|[2,4] :count проверки не пройдены|[5,*] :count проверок не пройдено',
        'warnings' => '{1} :count предупреждение|[2,4] :count предупреждения|[5,*] :count предупреждений',
        'never_ran' => 'Ещё не проверялось',
    ],
];
