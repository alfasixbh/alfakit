<?php

declare(strict_types=1);

return [
    'select' => [
        'boolean' => [
            'true' => 'Oui',
            'false' => 'Non',
        ],
        'placeholder' => 'Sélectionner une option',
        'search_prompt' => 'Commencez à saisir pour rechercher…',
        'no_search_results' => 'Aucune option ne correspond à votre recherche.',
        'loading' => 'Chargement…',
    ],
    'key_value' => [
        'key' => 'Clé',
        'value' => 'Valeur',
        'add' => 'Ajouter une ligne',
        'delete' => 'Supprimer la ligne',
        'reorder' => 'Réorganiser',
    ],
    'repeater' => [
        'cannot_add' => 'Impossible d\'ajouter des éléments à :attribute.',
        'cannot_delete' => 'Impossible de supprimer des éléments de :attribute.',
        'cannot_reorder' => 'Les éléments de :attribute ne peuvent pas être réordonnés.',
        'add' => 'Ajouter à :label',
        'delete' => 'Supprimer',
        'clone' => 'Dupliquer',
        'move_up' => 'Monter',
        'move_down' => 'Descendre',
        'collapse' => 'Réduire',
        'expand' => 'Développer',
        'reorder' => 'Réorganiser',
        'collapse_all' => 'Tout réduire',
        'expand_all' => 'Tout développer',
    ],
    'wizard' => [
        'next' => 'Suivant',
        'previous' => 'Précédent',
        'submit' => 'Valider',
    ],
    'file_upload' => [
        'drop' => 'Glissez-déposez des fichiers ou',
        'browse' => 'parcourez',
        'uploading' => 'Envoi en cours…',
        'remove' => 'Retirer',
        'download' => 'Télécharger',
        'too_large' => 'Ce fichier est trop volumineux.',
        'invalid_type' => 'Ce type de fichier n\'est pas autorisé.',
        'too_small' => 'Ce fichier est trop petit.',
        'unavailable' => 'Ce téléversement n’est plus disponible. Téléversez à nouveau le fichier.',
        'invalid_dimensions' => 'Les dimensions de l’image ne sont pas autorisées.',
        'invalid_aspect_ratio' => 'Le format de l’image n’est pas autorisé.',
        'chunk_failed' => 'L’envoi est incomplet. Envoyez à nouveau le fichier.',
        'types' => [
            'images' => 'Images',
            'videos' => 'Vidéos',
            'audio' => 'Fichiers audio',
            'text' => 'Fichiers texte',
        ],
    ],
    'tags_input' => [
        'placeholder' => 'Ajouter une étiquette…',
    ],
    'rich_editor' => [
        'link_prompt' => 'Saisissez une URL',
        'insert_block' => 'Insérer :block',
        'edit_block' => 'Modifier :block',
        'save_block' => 'Enregistrer',
        'insert' => 'Insérer',
        'text_colors' => [
            'red' => 'Rouge',
            'orange' => 'Orange',
            'amber' => 'Ambre',
            'green' => 'Vert',
            'teal' => 'Sarcelle',
            'blue' => 'Bleu',
            'indigo' => 'Indigo',
            'purple' => 'Violet',
            'pink' => 'Rose',
            'gray' => 'Gris',
        ],
    ],
    'actions' => [
        'save' => 'Enregistrer les modifications',
        'create' => 'Créer',
        'create_another' => 'Créer et créer un autre',
        'cancel' => 'Annuler',
        'saved' => 'Enregistré',
        'created' => 'Créé',
    ],
    'builder' => [
        'add' => 'Ajouter à :label',
        'block_max_items' => ':block ne peut être utilisé qu’une fois.|:block peut être utilisé jusqu’à :count fois.',
    ],
    'slider' => [
        'difference' => 'L’écart entre les valeurs doit être compris entre :min et :max.',
    ],
    'modal_table_select' => [
        'heading' => 'Sélectionner :label',
        'select' => 'Sélectionner',
    ],
    'translatable' => [
        'attribute' => ':attribute (:locale)',
        'editing_language' => 'Langue d’édition',
    ],
    'morph_to_select' => [
        'type' => 'Type',
    ],
    'icon_picker' => [
        'invalid' => 'L\'icône sélectionnée n\'est pas disponible.',
    ],
];
