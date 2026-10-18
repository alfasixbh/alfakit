<?php

declare(strict_types=1);

return [
    'page' => [
        'title' => 'Copias de seguridad',
        'navigation_label' => 'Copias de seguridad',
    ],

    'table' => [
        'heading' => 'Copias de seguridad',
        'columns' => [
            'name' => 'Copia de seguridad',
            'disk' => 'Disco',
            'date' => 'Fecha',
            'size' => 'Tamaño',
        ],
        'filters' => [
            'disk' => 'Disco',
        ],
        'empty' => [
            'heading' => 'Aún no hay copias de seguridad',
            'description' => 'Cree una copia de seguridad para verla aquí.',
        ],
    ],

    'destinations' => [
        'heading' => 'Destinos de las copias de seguridad',
        'label' => ':name en :disk',
        'healthy' => 'En buen estado',
        'unhealthy' => 'Con problemas',
        'unreachable' => 'Inaccesible',
        'summary' => '{0} Sin copias de seguridad · :size usados|{1} :count copia de seguridad · :size usados · la más reciente :newest|[2,*] :count copias de seguridad · :size usados · la más reciente :newest',
    ],

    'actions' => [
        'create' => [
            'label' => 'Crear copia de seguridad',
            'modal_heading' => 'Crear una copia de seguridad',
            'modal_description' => 'La copia de seguridad se ejecuta en segundo plano; aparecerá en la lista cuando termine.',
            'submit' => 'Crear copia de seguridad',
            'option' => 'Copiar',
            'options' => [
                'all' => 'Base de datos y archivos',
                'only_db' => 'Solo la base de datos',
                'only_files' => 'Solo los archivos',
            ],
            'notification' => 'Creando una nueva copia de seguridad en segundo plano',
        ],
        'download' => [
            'label' => 'Descargar',
        ],
        'delete' => [
            'label' => 'Eliminar',
            'modal_heading' => 'Eliminar copia de seguridad',
            'modal_description' => '¿Eliminar :name? Esta acción no se puede deshacer.',
            'submit' => 'Eliminar',
            'notification' => 'Copia de seguridad eliminada',
        ],
    ],
];
