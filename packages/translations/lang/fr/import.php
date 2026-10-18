<?php

declare(strict_types=1);

return [
    'label' => 'Importer :label',
    'column_number' => 'Colonne :number',
    'modal' => [
        'heading' => 'Importer :label',
        'max_rows' => 'Les fichiers peuvent contenir jusqu’à :count lignes.',
        'submit' => 'Importer',
        'file' => 'Fichier CSV',
        'columns' => 'Colonnes',
        'skip_column' => 'Ne pas importer',
        'example' => 'Télécharger un CSV d’exemple',
    ],
    'validation' => [
        'max_rows' => '{1} Le fichier peut contenir au plus :count ligne.|[2,*] Le fichier peut contenir au plus :count lignes.',
    ],
    'notifications' => [
        'started' => [
            'title' => 'Importation lancée',
            'body' => '{1} :count ligne est en cours d’importation. Vous serez averti à la fin.|[2,*] :count lignes sont en cours d’importation. Vous serez averti à la fin.',
        ],
        'completed' => [
            'title' => 'Importation terminée',
            'body' => '{0} Aucune ligne n’a été importée.|{1} :count ligne a été importée.|[2,*] :count lignes ont été importées.',
            'failed' => '{1} :count ligne a échoué.|[2,*] :count lignes ont échoué.',
            'download_failed_rows' => '{1} Télécharger la ligne en échec|[2,*] Télécharger les lignes en échec',
        ],
    ],
    'failures' => [
        'record_not_found' => 'L’enregistrement à mettre à jour est introuvable.',
        'relationship_not_found' => 'Aucun :attribute ne correspond à « :value ».',
        'unauthorized' => 'Vous n’êtes pas autorisé à modifier cet enregistrement.',
        'unexpected' => 'La ligne n’a pas pu être importée.',
    ],
    'failed_rows' => [
        'error' => 'Erreur',
    ],
];
