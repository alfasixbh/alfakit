<?php

declare(strict_types=1);

return [
    'page' => [
        'title' => 'Backup',
        'navigation_label' => 'Backup',
    ],

    'table' => [
        'heading' => 'Backup',
        'columns' => [
            'name' => 'Backup',
            'disk' => 'Disco',
            'date' => 'Data',
            'size' => 'Dimensione',
        ],
        'filters' => [
            'disk' => 'Disco',
        ],
        'empty' => [
            'heading' => 'Ancora nessun backup',
            'description' => 'Crea un backup per vederlo qui.',
        ],
    ],

    'destinations' => [
        'heading' => 'Destinazioni dei backup',
        'label' => ':name su :disk',
        'healthy' => 'Integra',
        'unhealthy' => 'Con problemi',
        'unreachable' => 'Non raggiungibile',
        'summary' => '{0} Nessun backup · :size utilizzati|{1} :count backup · :size utilizzati · il più recente :newest|[2,*] :count backup · :size utilizzati · il più recente :newest',
    ],

    'actions' => [
        'create' => [
            'label' => 'Crea backup',
            'modal_heading' => 'Crea un backup',
            'modal_description' => 'Il backup viene eseguito in background; comparirà nell’elenco al termine.',
            'submit' => 'Crea backup',
            'option' => 'Esegui il backup di',
            'options' => [
                'all' => 'Database e file',
                'only_db' => 'Solo database',
                'only_files' => 'Solo file',
            ],
            'notification' => 'Creazione di un nuovo backup in background',
        ],
        'download' => [
            'label' => 'Scarica',
        ],
        'delete' => [
            'label' => 'Elimina',
            'modal_heading' => 'Elimina backup',
            'modal_description' => 'Eliminare :name? L’operazione non può essere annullata.',
            'submit' => 'Elimina',
            'notification' => 'Backup eliminato',
        ],
    ],
];
