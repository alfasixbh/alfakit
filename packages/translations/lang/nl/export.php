<?php

declare(strict_types=1);

return [
    'label' => ':label exporteren',
    'bulk_label' => 'Selectie exporteren',
    'modal' => [
        'heading' => ':label exporteren',
        'submit' => 'Exporteren',
        'columns' => 'Kolommen',
        'description' => 'De export loopt op de achtergrond. Je krijgt een melding als de bestanden klaar zijn.',
        'column_labels' => 'Kolomlabels',
    ],
    'notifications' => [
        'started' => [
            'title' => 'Export gestart',
            'body' => '{1} :count rij wordt geëxporteerd. Je krijgt een melding als de bestanden klaar zijn.|[2,*] :count rijen worden geëxporteerd. Je krijgt een melding als de bestanden klaar zijn.',
        ],
        'completed' => [
            'title' => 'Export voltooid',
            'body' => '{0} Er zijn geen rijen geëxporteerd.|{1} :count rij is geëxporteerd.|[2,*] :count rijen zijn geëxporteerd.',
            'failed' => '{1} :count rij is mislukt.|[2,*] :count rijen zijn mislukt.',
            'download_csv' => '.csv downloaden',
            'download_xlsx' => '.xlsx downloaden',
        ],
        'max_rows' => [
            'title' => 'Te veel rijen',
            'body' => '{1} Je kunt maximaal :count rij tegelijk exporteren.|[2,*] Je kunt maximaal :count rijen tegelijk exporteren.',
        ],
    ],
];
