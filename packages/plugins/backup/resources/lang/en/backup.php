<?php

declare(strict_types=1);

return [
    'page' => [
        'title' => 'Backups',
        'navigation_label' => 'Backups',
    ],

    'table' => [
        'heading' => 'Backups',
        'columns' => [
            'name' => 'Backup',
            'disk' => 'Disk',
            'date' => 'Date',
            'size' => 'Size',
        ],
        'filters' => [
            'disk' => 'Disk',
        ],
        'empty' => [
            'heading' => 'No backups yet',
            'description' => 'Create a backup to see it here.',
        ],
    ],

    'destinations' => [
        'heading' => 'Backup destinations',
        'label' => ':name on :disk',
        'healthy' => 'Healthy',
        'unhealthy' => 'Unhealthy',
        'unreachable' => 'Unreachable',
        'summary' => '{0} No backups · :size used|{1} :count backup · :size used · newest :newest|[2,*] :count backups · :size used · newest :newest',
    ],

    'actions' => [
        'create' => [
            'label' => 'Create backup',
            'modal_heading' => 'Create a backup',
            'modal_description' => 'The backup runs in the background; it appears in the list when it is done.',
            'submit' => 'Create backup',
            'option' => 'Back up',
            'options' => [
                'all' => 'Database and files',
                'only_db' => 'Database only',
                'only_files' => 'Files only',
            ],
            'notification' => 'Creating a new backup in the background',
        ],
        'download' => [
            'label' => 'Download',
        ],
        'delete' => [
            'label' => 'Delete',
            'modal_heading' => 'Delete backup',
            'modal_description' => 'Delete :name? This cannot be undone.',
            'submit' => 'Delete',
            'notification' => 'Backup deleted',
        ],
    ],
];
