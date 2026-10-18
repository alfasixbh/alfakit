<?php

declare(strict_types=1);

return [
    'label' => ':label importeren',
    'column_number' => 'Kolom :number',
    'modal' => [
        'heading' => ':label importeren',
        'max_rows' => 'Bestanden mogen tot :count rijen bevatten.',
        'submit' => 'Importeren',
        'file' => 'CSV-bestand',
        'columns' => 'Kolommen',
        'skip_column' => 'Niet importeren',
        'example' => 'Voorbeeld-CSV downloaden',
    ],
    'validation' => [
        'max_rows' => '{1} Het bestand mag maximaal :count rij bevatten.|[2,*] Het bestand mag maximaal :count rijen bevatten.',
    ],
    'notifications' => [
        'started' => [
            'title' => 'Import gestart',
            'body' => '{1} :count rij wordt geïmporteerd. Je krijgt een melding als het klaar is.|[2,*] :count rijen worden geïmporteerd. Je krijgt een melding als het klaar is.',
        ],
        'completed' => [
            'title' => 'Import voltooid',
            'body' => '{0} Er zijn geen rijen geïmporteerd.|{1} :count rij is geïmporteerd.|[2,*] :count rijen zijn geïmporteerd.',
            'failed' => '{1} :count rij is mislukt.|[2,*] :count rijen zijn mislukt.',
            'download_failed_rows' => '{1} Mislukte rij downloaden|[2,*] Mislukte rijen downloaden',
        ],
    ],
    'failures' => [
        'record_not_found' => 'Het bij te werken record is niet gevonden.',
        'relationship_not_found' => 'Geen :attribute komt overeen met ":value".',
        'unauthorized' => 'Je mag dit record niet bijwerken.',
        'unexpected' => 'De rij kon niet worden geïmporteerd.',
    ],
    'failed_rows' => [
        'error' => 'Fout',
    ],
];
