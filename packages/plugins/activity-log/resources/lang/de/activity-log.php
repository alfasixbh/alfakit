<?php

declare(strict_types=1);

return [
    'resource' => [
        'label' => 'Aktivität',
        'plural_label' => 'Aktivitäten',
        'navigation_label' => 'Aktivitätsprotokoll',
    ],

    'relation_manager' => [
        'title' => 'Aktivität',
    ],

    'fields' => [
        'log_name' => 'Protokoll',
        'event' => 'Ereignis',
        'description' => 'Beschreibung',
        'subject' => 'Objekt',
        'subject_type' => 'Objekttyp',
        'causer' => 'Verursacher',
        'created_at' => 'Datum',
        'created_from' => 'Von',
        'created_until' => 'Bis',
        'changes' => 'Änderungen',
        'attribute' => 'Attribut',
        'old' => 'Alter Wert',
        'new' => 'Neuer Wert',
        'property' => 'Eigenschaft',
        'value' => 'Wert',
    ],

    'sections' => [
        'overview' => 'Übersicht',
        'changes' => 'Änderungen',
        'properties' => 'Eigenschaften',
    ],

    'filters' => [
        'created_from_indicator' => 'Von :date',
        'created_until_indicator' => 'Bis :date',
    ],

    'events' => [
        'created' => 'Erstellt',
        'updated' => 'Aktualisiert',
        'deleted' => 'Gelöscht',
        'restored' => 'Wiederhergestellt',
    ],

    'causer' => [
        'system' => 'System',
    ],

    'timeline' => [
        'label' => 'Aktivität',
        'empty' => 'Noch keine Aktivität.',
        'entry' => ':event von :causer',
    ],

    'empty' => [
        'heading' => 'Noch keine Aktivität',
        'description' => 'Änderungen an Ihren Datensätzen werden hier aufgelistet.',
    ],
];
