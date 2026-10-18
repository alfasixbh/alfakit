<?php

declare(strict_types=1);

return [
    'resource' => [
        'label' => 'actividad',
        'plural_label' => 'actividades',
        'navigation_label' => 'Registro de actividad',
    ],

    'relation_manager' => [
        'title' => 'Actividad',
    ],

    'fields' => [
        'log_name' => 'Registro',
        'event' => 'Evento',
        'description' => 'Descripción',
        'subject' => 'Sujeto',
        'subject_type' => 'Tipo de sujeto',
        'causer' => 'Autor',
        'created_at' => 'Fecha',
        'created_from' => 'Desde',
        'created_until' => 'Hasta',
        'changes' => 'Cambios',
        'attribute' => 'Atributo',
        'old' => 'Valor anterior',
        'new' => 'Valor nuevo',
        'property' => 'Propiedad',
        'value' => 'Valor',
    ],

    'sections' => [
        'overview' => 'Resumen',
        'changes' => 'Cambios',
        'properties' => 'Propiedades',
    ],

    'filters' => [
        'created_from_indicator' => 'Desde :date',
        'created_until_indicator' => 'Hasta :date',
    ],

    'events' => [
        'created' => 'Creado',
        'updated' => 'Actualizado',
        'deleted' => 'Eliminado',
        'restored' => 'Restaurado',
    ],

    'causer' => [
        'system' => 'Sistema',
    ],

    'timeline' => [
        'label' => 'Actividad',
        'empty' => 'Aún no hay actividad.',
        'entry' => ':event por :causer',
    ],

    'empty' => [
        'heading' => 'Aún no hay actividad',
        'description' => 'Los cambios en sus registros aparecerán aquí.',
    ],
];
