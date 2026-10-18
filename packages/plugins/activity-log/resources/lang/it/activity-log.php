<?php

declare(strict_types=1);

return [
    'resource' => [
        'label' => 'attività',
        'plural_label' => 'attività',
        'navigation_label' => 'Registro attività',
    ],

    'relation_manager' => [
        'title' => 'Attività',
    ],

    'fields' => [
        'log_name' => 'Registro',
        'event' => 'Evento',
        'description' => 'Descrizione',
        'subject' => 'Oggetto',
        'subject_type' => 'Tipo di oggetto',
        'causer' => 'Autore',
        'created_at' => 'Data',
        'created_from' => 'Dal',
        'created_until' => 'Al',
        'changes' => 'Modifiche',
        'attribute' => 'Attributo',
        'old' => 'Valore precedente',
        'new' => 'Nuovo valore',
        'property' => 'Proprietà',
        'value' => 'Valore',
    ],

    'sections' => [
        'overview' => 'Panoramica',
        'changes' => 'Modifiche',
        'properties' => 'Proprietà',
    ],

    'filters' => [
        'created_from_indicator' => 'Dal :date',
        'created_until_indicator' => 'Al :date',
    ],

    'events' => [
        'created' => 'Creato',
        'updated' => 'Aggiornato',
        'deleted' => 'Eliminato',
        'restored' => 'Ripristinato',
    ],

    'causer' => [
        'system' => 'Sistema',
    ],

    'timeline' => [
        'label' => 'Attività',
        'empty' => 'Ancora nessuna attività.',
        'entry' => ':event da :causer',
    ],

    'empty' => [
        'heading' => 'Ancora nessuna attività',
        'description' => 'Le modifiche ai tuoi record verranno elencate qui.',
    ],
];
