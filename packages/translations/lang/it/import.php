<?php

declare(strict_types=1);

return [
    'label' => 'Importa :label',
    'column_number' => 'Colonna :number',
    'modal' => [
        'heading' => 'Importa :label',
        'max_rows' => 'I file possono contenere fino a :count righe.',
        'submit' => 'Importa',
        'file' => 'File CSV',
        'columns' => 'Colonne',
        'skip_column' => 'Non importare',
        'example' => 'Scarica CSV di esempio',
    ],
    'validation' => [
        'max_rows' => '{1} Il file può contenere al massimo :count riga.|[2,*] Il file può contenere al massimo :count righe.',
    ],
    'notifications' => [
        'started' => [
            'title' => 'Importazione avviata',
            'body' => '{1} È in corso l’importazione di :count riga. Riceverai una notifica al termine.|[2,*] È in corso l’importazione di :count righe. Riceverai una notifica al termine.',
        ],
        'completed' => [
            'title' => 'Importazione completata',
            'body' => '{0} Nessuna riga importata.|{1} :count riga importata.|[2,*] :count righe importate.',
            'failed' => '{1} :count riga non riuscita.|[2,*] :count righe non riuscite.',
            'download_failed_rows' => '{1} Scarica la riga non riuscita|[2,*] Scarica le righe non riuscite',
        ],
    ],
    'failures' => [
        'record_not_found' => 'Il record da aggiornare non è stato trovato.',
        'relationship_not_found' => 'Nessun :attribute corrisponde a «:value».',
        'unauthorized' => 'Non sei autorizzato ad aggiornare questo record.',
        'unexpected' => 'Impossibile importare la riga.',
    ],
    'failed_rows' => [
        'error' => 'Errore',
    ],
];
