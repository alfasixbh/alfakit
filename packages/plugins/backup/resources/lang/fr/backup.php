<?php

declare(strict_types=1);

return [
    'page' => [
        'title' => 'Sauvegardes',
        'navigation_label' => 'Sauvegardes',
    ],

    'table' => [
        'heading' => 'Sauvegardes',
        'columns' => [
            'name' => 'Sauvegarde',
            'disk' => 'Disque',
            'date' => 'Date',
            'size' => 'Taille',
        ],
        'filters' => [
            'disk' => 'Disque',
        ],
        'empty' => [
            'heading' => 'Aucune sauvegarde pour le moment',
            'description' => 'Créez une sauvegarde pour la voir ici.',
        ],
    ],

    'destinations' => [
        'heading' => 'Destinations de sauvegarde',
        'label' => ':name sur :disk',
        'healthy' => 'Opérationnelle',
        'unhealthy' => 'Défaillante',
        'unreachable' => 'Inaccessible',
        'summary' => '{0} Aucune sauvegarde · :size utilisés|{1} :count sauvegarde · :size utilisés · la plus récente :newest|[2,*] :count sauvegardes · :size utilisés · la plus récente :newest',
    ],

    'actions' => [
        'create' => [
            'label' => 'Créer une sauvegarde',
            'modal_heading' => 'Créer une sauvegarde',
            'modal_description' => 'La sauvegarde s’exécute en arrière-plan ; elle apparaît dans la liste une fois terminée.',
            'submit' => 'Créer la sauvegarde',
            'option' => 'Sauvegarder',
            'options' => [
                'all' => 'Base de données et fichiers',
                'only_db' => 'Base de données uniquement',
                'only_files' => 'Fichiers uniquement',
            ],
            'notification' => 'Création d’une nouvelle sauvegarde en arrière-plan',
        ],
        'download' => [
            'label' => 'Télécharger',
        ],
        'delete' => [
            'label' => 'Supprimer',
            'modal_heading' => 'Supprimer la sauvegarde',
            'modal_description' => 'Supprimer :name ? Cette action est irréversible.',
            'submit' => 'Supprimer',
            'notification' => 'Sauvegarde supprimée',
        ],
    ],
];
