<?php

declare(strict_types=1);

return [

    'notifications' => [
        'saved' => 'Orden guardado',
    ],

    // Node buttons: they name the node, like the move buttons.
    'actions' => [
        'view' => 'Ver :title',
        'edit' => 'Editar :title',
        'delete' => 'Eliminar :title',
    ],

    'validation' => [
        'invalid' => 'No se pudo leer el árbol.',
        'unknown_record' => 'Un registro del árbol ya no existe. Recargue la página e inténtelo de nuevo.',
        'duplicate_record' => 'Un registro aparece más de una vez en el árbol.',
        'unknown_parent' => 'Un registro padre ya no existe. Recargue la página e inténtelo de nuevo.',
        'cycle' => 'Un registro no se puede mover dentro de sí mismo.',
        'max_depth' => 'El árbol puede tener como máximo :depth niveles de profundidad.',
    ],

    // Shared with the renderers as `tree.*` (see TreePlugin::register()).
    'ui' => [
        'label' => 'Árbol',
        'expand_all' => 'Expandir todo',
        'collapse_all' => 'Contraer todo',
        'expand' => 'Expandir :title',
        'collapse' => 'Contraer :title',
        'move_up' => 'Subir :title',
        'move_down' => 'Bajar :title',
        'indent' => 'Mover :title dentro del elemento anterior',
        'outdent' => 'Sacar :title de su elemento padre',
        'save' => 'Guardar orden',
        'saving' => 'Guardando…',
        'discard' => 'Descartar cambios',
        'unsaved' => 'Tiene cambios sin guardar en el orden.',
        'save_failed' => 'No se pudo guardar el orden.',
        'empty' => 'Aún no hay registros',
        'moved' => ':title movido a la posición :position de :count, nivel :level.',
    ],

];
