<?php

declare(strict_types=1);

return [
    'page' => [
        'title' => 'Sicherungen',
        'navigation_label' => 'Sicherungen',
    ],

    'table' => [
        'heading' => 'Sicherungen',
        'columns' => [
            'name' => 'Sicherung',
            'disk' => 'Speicher',
            'date' => 'Datum',
            'size' => 'Größe',
        ],
        'filters' => [
            'disk' => 'Speicher',
        ],
        'empty' => [
            'heading' => 'Noch keine Sicherungen',
            'description' => 'Erstellen Sie eine Sicherung, damit sie hier angezeigt wird.',
        ],
    ],

    'destinations' => [
        'heading' => 'Sicherungsziele',
        'label' => ':name auf :disk',
        'healthy' => 'Fehlerfrei',
        'unhealthy' => 'Fehlerhaft',
        'unreachable' => 'Nicht erreichbar',
        'summary' => '{0} Keine Sicherungen · :size belegt|{1} :count Sicherung · :size belegt · neueste :newest|[2,*] :count Sicherungen · :size belegt · neueste :newest',
    ],

    'actions' => [
        'create' => [
            'label' => 'Sicherung erstellen',
            'modal_heading' => 'Sicherung erstellen',
            'modal_description' => 'Die Sicherung läuft im Hintergrund und erscheint in der Liste, sobald sie fertig ist.',
            'submit' => 'Sicherung erstellen',
            'option' => 'Sichern',
            'options' => [
                'all' => 'Datenbank und Dateien',
                'only_db' => 'Nur Datenbank',
                'only_files' => 'Nur Dateien',
            ],
            'notification' => 'Neue Sicherung wird im Hintergrund erstellt',
        ],
        'download' => [
            'label' => 'Herunterladen',
        ],
        'delete' => [
            'label' => 'Löschen',
            'modal_heading' => 'Sicherung löschen',
            'modal_description' => ':name löschen? Dies kann nicht rückgängig gemacht werden.',
            'submit' => 'Löschen',
            'notification' => 'Sicherung gelöscht',
        ],
    ],
];
