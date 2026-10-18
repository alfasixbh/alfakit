<?php

declare(strict_types=1);

return [
    'label' => 'Exporter :label',
    'bulk_label' => 'Exporter la sélection',
    'modal' => [
        'heading' => 'Exporter :label',
        'submit' => 'Exporter',
        'columns' => 'Colonnes',
        'description' => 'L’export s’exécute en arrière-plan. Vous serez averti lorsque les fichiers seront prêts.',
        'column_labels' => 'Libellés des colonnes',
    ],
    'notifications' => [
        'started' => [
            'title' => 'Export lancé',
            'body' => '{1} :count ligne est en cours d’export. Vous serez averti lorsque les fichiers seront prêts.|[2,*] :count lignes sont en cours d’export. Vous serez averti lorsque les fichiers seront prêts.',
        ],
        'completed' => [
            'title' => 'Export terminé',
            'body' => '{0} Aucune ligne n’a été exportée.|{1} :count ligne a été exportée.|[2,*] :count lignes ont été exportées.',
            'failed' => '{1} :count ligne a échoué.|[2,*] :count lignes ont échoué.',
            'download_csv' => 'Télécharger le .csv',
            'download_xlsx' => 'Télécharger le .xlsx',
        ],
        'max_rows' => [
            'title' => 'Trop de lignes',
            'body' => '{1} Vous pouvez exporter au plus :count ligne à la fois.|[2,*] Vous pouvez exporter au plus :count lignes à la fois.',
        ],
    ],
];
