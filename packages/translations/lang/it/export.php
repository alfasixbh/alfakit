<?php

declare(strict_types=1);

return [
    'label' => 'Esporta :label',
    'bulk_label' => 'Esporta selezionati',
    'modal' => [
        'heading' => 'Esporta :label',
        'submit' => 'Esporta',
        'columns' => 'Colonne',
        'description' => 'L’esportazione viene eseguita in background. Riceverai una notifica quando i file saranno pronti.',
        'column_labels' => 'Etichette delle colonne',
    ],
    'notifications' => [
        'started' => [
            'title' => 'Esportazione avviata',
            'body' => '{1} È in corso l’esportazione di :count riga. Riceverai una notifica quando i file saranno pronti.|[2,*] È in corso l’esportazione di :count righe. Riceverai una notifica quando i file saranno pronti.',
        ],
        'completed' => [
            'title' => 'Esportazione completata',
            'body' => '{0} Nessuna riga esportata.|{1} :count riga esportata.|[2,*] :count righe esportate.',
            'failed' => '{1} :count riga non riuscita.|[2,*] :count righe non riuscite.',
            'download_csv' => 'Scarica .csv',
            'download_xlsx' => 'Scarica .xlsx',
        ],
        'max_rows' => [
            'title' => 'Troppe righe',
            'body' => '{1} Puoi esportare al massimo :count riga alla volta.|[2,*] Puoi esportare al massimo :count righe alla volta.',
        ],
    ],
];
