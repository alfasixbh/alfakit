<?php

declare(strict_types=1);

return [

    'notifications' => [
        'saved' => 'Ordine salvato',
    ],

    // Node buttons: they name the node, like the move buttons.
    'actions' => [
        'view' => 'Visualizza :title',
        'edit' => 'Modifica :title',
        'delete' => 'Elimina :title',
    ],

    'validation' => [
        'invalid' => 'Impossibile leggere l’albero.',
        'unknown_record' => 'Un record dell’albero non esiste più. Ricarica la pagina e riprova.',
        'duplicate_record' => 'Un record compare più di una volta nell’albero.',
        'unknown_parent' => 'Un record padre non esiste più. Ricarica la pagina e riprova.',
        'cycle' => 'Un record non può essere spostato dentro sé stesso.',
        'max_depth' => 'L’albero può avere al massimo :depth livelli di profondità.',
    ],

    // Shared with the renderers as `tree.*` (see TreePlugin::register()).
    'ui' => [
        'label' => 'Albero',
        'expand_all' => 'Espandi tutto',
        'collapse_all' => 'Comprimi tutto',
        'expand' => 'Espandi :title',
        'collapse' => 'Comprimi :title',
        'move_up' => 'Sposta :title in alto',
        'move_down' => 'Sposta :title in basso',
        'indent' => 'Sposta :title dentro l’elemento precedente',
        'outdent' => 'Sposta :title fuori dal suo elemento padre',
        'save' => 'Salva ordine',
        'saving' => 'Salvataggio…',
        'discard' => 'Annulla modifiche',
        'unsaved' => 'Ci sono modifiche non salvate all’ordine.',
        'save_failed' => 'Impossibile salvare l’ordine.',
        'empty' => 'Ancora nessun record',
        'moved' => ':title spostato nella posizione :position di :count, livello :level.',
    ],

];
