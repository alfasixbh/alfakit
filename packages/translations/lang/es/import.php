<?php

declare(strict_types=1);

return [
    'label' => 'Importar :label',
    'column_number' => 'Columna :number',
    'modal' => [
        'heading' => 'Importar :label',
        'max_rows' => 'Los archivos pueden tener hasta :count filas.',
        'submit' => 'Importar',
        'file' => 'Archivo CSV',
        'columns' => 'Columnas',
        'skip_column' => 'No importar',
        'example' => 'Descargar CSV de ejemplo',
    ],
    'validation' => [
        'max_rows' => '{1} El archivo puede tener como máximo :count fila.|[2,*] El archivo puede tener como máximo :count filas.',
    ],
    'notifications' => [
        'started' => [
            'title' => 'Importación iniciada',
            'body' => '{1} Se está importando :count fila. Recibirás una notificación cuando termine.|[2,*] Se están importando :count filas. Recibirás una notificación cuando termine.',
        ],
        'completed' => [
            'title' => 'Importación completada',
            'body' => '{0} No se importó ninguna fila.|{1} Se importó :count fila.|[2,*] Se importaron :count filas.',
            'failed' => '{1} Falló :count fila.|[2,*] Fallaron :count filas.',
            'download_failed_rows' => '{1} Descargar la fila fallida|[2,*] Descargar las filas fallidas',
        ],
    ],
    'failures' => [
        'record_not_found' => 'No se encontró el registro que se debía actualizar.',
        'relationship_not_found' => 'Ningún :attribute coincide con «:value».',
        'unauthorized' => 'No tienes permiso para actualizar este registro.',
        'unexpected' => 'No se pudo importar la fila.',
    ],
    'failed_rows' => [
        'error' => 'Error',
    ],
];
