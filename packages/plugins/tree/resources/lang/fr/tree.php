<?php

declare(strict_types=1);

return [

    'notifications' => [
        'saved' => 'Ordre enregistré',
    ],

    // Node buttons: they name the node, like the move buttons.
    'actions' => [
        'view' => 'Voir :title',
        'edit' => 'Modifier :title',
        'delete' => 'Supprimer :title',
    ],

    'validation' => [
        'invalid' => 'L’arborescence n’a pas pu être lue.',
        'unknown_record' => 'Un enregistrement de l’arborescence n’existe plus. Rechargez la page et réessayez.',
        'duplicate_record' => 'Un enregistrement apparaît plusieurs fois dans l’arborescence.',
        'unknown_parent' => 'Un enregistrement parent n’existe plus. Rechargez la page et réessayez.',
        'cycle' => 'Un enregistrement ne peut pas être déplacé à l’intérieur de lui-même.',
        'max_depth' => 'L’arborescence peut avoir au plus :depth niveaux de profondeur.',
    ],

    // Shared with the renderers as `tree.*` (see TreePlugin::register()).
    'ui' => [
        'label' => 'Arborescence',
        'expand_all' => 'Tout déplier',
        'collapse_all' => 'Tout replier',
        'expand' => 'Déplier :title',
        'collapse' => 'Replier :title',
        'move_up' => 'Monter :title',
        'move_down' => 'Descendre :title',
        'indent' => 'Déplacer :title dans l’élément au-dessus',
        'outdent' => 'Sortir :title de son parent',
        'save' => 'Enregistrer l’ordre',
        'saving' => 'Enregistrement…',
        'discard' => 'Annuler les modifications',
        'unsaved' => 'Vous avez des modifications non enregistrées de l’ordre.',
        'save_failed' => 'L’ordre n’a pas pu être enregistré.',
        'empty' => 'Aucun enregistrement pour le moment',
        'moved' => ':title déplacé en position :position sur :count, niveau :level.',
    ],

];
