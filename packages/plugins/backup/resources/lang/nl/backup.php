<?php

declare(strict_types=1);

return [
    'page' => [
        'title' => 'Back-ups',
        'navigation_label' => 'Back-ups',
    ],

    'table' => [
        'heading' => 'Back-ups',
        'columns' => [
            'name' => 'Back-up',
            'disk' => 'Schijf',
            'date' => 'Datum',
            'size' => 'Grootte',
        ],
        'filters' => [
            'disk' => 'Schijf',
        ],
        'empty' => [
            'heading' => 'Nog geen back-ups',
            'description' => 'Maak een back-up om die hier te zien.',
        ],
    ],

    'destinations' => [
        'heading' => 'Back-upbestemmingen',
        'label' => ':name op :disk',
        'healthy' => 'In orde',
        'unhealthy' => 'Niet in orde',
        'unreachable' => 'Onbereikbaar',
        'summary' => '{0} Geen back-ups · :size gebruikt|{1} :count back-up · :size gebruikt · nieuwste :newest|[2,*] :count back-ups · :size gebruikt · nieuwste :newest',
    ],

    'actions' => [
        'create' => [
            'label' => 'Back-up maken',
            'modal_heading' => 'Een back-up maken',
            'modal_description' => 'De back-up draait op de achtergrond en verschijnt in de lijst zodra hij klaar is.',
            'submit' => 'Back-up maken',
            'option' => 'Back-up van',
            'options' => [
                'all' => 'Database en bestanden',
                'only_db' => 'Alleen database',
                'only_files' => 'Alleen bestanden',
            ],
            'notification' => 'Nieuwe back-up wordt op de achtergrond gemaakt',
        ],
        'download' => [
            'label' => 'Downloaden',
        ],
        'delete' => [
            'label' => 'Verwijderen',
            'modal_heading' => 'Back-up verwijderen',
            'modal_description' => ':name verwijderen? Dit kan niet ongedaan worden gemaakt.',
            'submit' => 'Verwijderen',
            'notification' => 'Back-up verwijderd',
        ],
    ],
];
