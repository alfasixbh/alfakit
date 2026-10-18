<?php

declare(strict_types=1);

return [
    'label' => ':label exportieren',
    'bulk_label' => 'Auswahl exportieren',
    'modal' => [
        'heading' => ':label exportieren',
        'submit' => 'Exportieren',
        'columns' => 'Spalten',
        'description' => 'Der Export läuft im Hintergrund. Sie werden benachrichtigt, sobald die Dateien bereitstehen.',
        'column_labels' => 'Spaltenbezeichnungen',
    ],
    'notifications' => [
        'started' => [
            'title' => 'Export gestartet',
            'body' => '{1} :count Zeile wird exportiert. Sie werden benachrichtigt, sobald die Dateien bereitstehen.|[2,*] :count Zeilen werden exportiert. Sie werden benachrichtigt, sobald die Dateien bereitstehen.',
        ],
        'completed' => [
            'title' => 'Export abgeschlossen',
            'body' => '{0} Es wurden keine Zeilen exportiert.|{1} :count Zeile wurde exportiert.|[2,*] :count Zeilen wurden exportiert.',
            'failed' => '{1} :count Zeile ist fehlgeschlagen.|[2,*] :count Zeilen sind fehlgeschlagen.',
            'download_csv' => '.csv herunterladen',
            'download_xlsx' => '.xlsx herunterladen',
        ],
        'max_rows' => [
            'title' => 'Zu viele Zeilen',
            'body' => '{1} Sie können höchstens :count Zeile auf einmal exportieren.|[2,*] Sie können höchstens :count Zeilen auf einmal exportieren.',
        ],
    ],
];
