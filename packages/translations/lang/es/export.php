<?php

declare(strict_types=1);

return [
    'label' => 'Exportar :label',
    'bulk_label' => 'Exportar selección',
    'modal' => [
        'heading' => 'Exportar :label',
        'submit' => 'Exportar',
        'columns' => 'Columnas',
        'description' => 'La exportación se ejecuta en segundo plano. Recibirás una notificación cuando los archivos estén listos.',
        'column_labels' => 'Etiquetas de columnas',
    ],
    'notifications' => [
        'started' => [
            'title' => 'Exportación iniciada',
            'body' => '{1} Se está exportando :count fila. Recibirás una notificación cuando los archivos estén listos.|[2,*] Se están exportando :count filas. Recibirás una notificación cuando los archivos estén listos.',
        ],
        'completed' => [
            'title' => 'Exportación completada',
            'body' => '{0} No se exportó ninguna fila.|{1} Se exportó :count fila.|[2,*] Se exportaron :count filas.',
            'failed' => '{1} Falló :count fila.|[2,*] Fallaron :count filas.',
            'download_csv' => 'Descargar .csv',
            'download_xlsx' => 'Descargar .xlsx',
        ],
        'max_rows' => [
            'title' => 'Demasiadas filas',
            'body' => '{1} Puedes exportar como máximo :count fila a la vez.|[2,*] Puedes exportar como máximo :count filas a la vez.',
        ],
    ],
];
