<?php

declare(strict_types=1);

return [
    'label' => ':label importieren',
    'column_number' => 'Spalte :number',
    'modal' => [
        'heading' => ':label importieren',
        'max_rows' => 'Dateien dürfen bis zu :count Zeilen enthalten.',
        'submit' => 'Importieren',
        'file' => 'CSV-Datei',
        'columns' => 'Spalten',
        'skip_column' => 'Nicht importieren',
        'example' => 'Beispiel-CSV herunterladen',
    ],
    'validation' => [
        'max_rows' => '{1} Die Datei darf höchstens :count Zeile enthalten.|[2,*] Die Datei darf höchstens :count Zeilen enthalten.',
    ],
    'notifications' => [
        'started' => [
            'title' => 'Import gestartet',
            'body' => '{1} :count Zeile wird importiert. Sie werden benachrichtigt, sobald der Import fertig ist.|[2,*] :count Zeilen werden importiert. Sie werden benachrichtigt, sobald der Import fertig ist.',
        ],
        'completed' => [
            'title' => 'Import abgeschlossen',
            'body' => '{0} Es wurden keine Zeilen importiert.|{1} :count Zeile wurde importiert.|[2,*] :count Zeilen wurden importiert.',
            'failed' => '{1} :count Zeile ist fehlgeschlagen.|[2,*] :count Zeilen sind fehlgeschlagen.',
            'download_failed_rows' => '{1} Fehlgeschlagene Zeile herunterladen|[2,*] Fehlgeschlagene Zeilen herunterladen',
        ],
    ],
    'failures' => [
        'record_not_found' => 'Der zu aktualisierende Datensatz wurde nicht gefunden.',
        'relationship_not_found' => 'Kein Eintrag für :attribute entspricht „:value“.',
        'unauthorized' => 'Sie dürfen diesen Datensatz nicht aktualisieren.',
        'unexpected' => 'Die Zeile konnte nicht importiert werden.',
    ],
    'failed_rows' => [
        'error' => 'Fehler',
    ],
];
