<?php

declare(strict_types=1);

return [
    'select' => [
        'boolean' => [
            'true' => 'Sí',
            'false' => 'No',
        ],
        'placeholder' => 'Seleccione una opción',
        'search_prompt' => 'Empiece a escribir para buscar…',
        'no_search_results' => 'Ninguna opción coincide con su búsqueda.',
        'loading' => 'Cargando…',
    ],
    'key_value' => [
        'key' => 'Clave',
        'value' => 'Valor',
        'add' => 'Añadir fila',
        'delete' => 'Eliminar fila',
        'reorder' => 'Reordenar',
    ],
    'repeater' => [
        'cannot_add' => 'No se pueden añadir elementos a :attribute.',
        'cannot_delete' => 'No se pueden eliminar elementos de :attribute.',
        'cannot_reorder' => 'Los elementos de :attribute no se pueden reordenar.',
        'add' => 'Añadir a :label',
        'delete' => 'Eliminar',
        'clone' => 'Duplicar',
        'move_up' => 'Subir',
        'move_down' => 'Bajar',
        'collapse' => 'Contraer',
        'expand' => 'Expandir',
        'reorder' => 'Reordenar',
        'collapse_all' => 'Contraer todo',
        'expand_all' => 'Expandir todo',
    ],
    'wizard' => [
        'next' => 'Siguiente',
        'previous' => 'Atrás',
        'submit' => 'Enviar',
    ],
    'file_upload' => [
        'drop' => 'Arrastre y suelte archivos o',
        'browse' => 'examine',
        'uploading' => 'Subiendo…',
        'remove' => 'Quitar',
        'download' => 'Descargar',
        'too_large' => 'Este archivo es demasiado grande.',
        'invalid_type' => 'Este tipo de archivo no está permitido.',
        'too_small' => 'Este archivo es demasiado pequeño.',
        'unavailable' => 'Esta subida ya no está disponible. Vuelve a subir el archivo.',
        'invalid_dimensions' => 'Las dimensiones de la imagen no están permitidas.',
        'invalid_aspect_ratio' => 'La relación de aspecto de la imagen no está permitida.',
        'chunk_failed' => 'La subida está incompleta. Vuelve a subir el archivo.',
    ],
    'tags_input' => [
        'placeholder' => 'Añadir una etiqueta…',
    ],
    'rich_editor' => [
        'link_prompt' => 'Introduzca una URL',
        'insert_block' => 'Insertar :block',
        'edit_block' => 'Editar :block',
        'save_block' => 'Guardar',
        'insert' => 'Insertar',
        'text_colors' => [
            'red' => 'Rojo',
            'orange' => 'Naranja',
            'amber' => 'Ámbar',
            'green' => 'Verde',
            'teal' => 'Verde azulado',
            'blue' => 'Azul',
            'indigo' => 'Índigo',
            'purple' => 'Morado',
            'pink' => 'Rosa',
            'gray' => 'Gris',
        ],
    ],
    'actions' => [
        'save' => 'Guardar cambios',
        'create' => 'Crear',
        'create_another' => 'Crear y crear otro',
        'cancel' => 'Cancelar',
        'saved' => 'Guardado',
        'created' => 'Creado',
    ],
    'builder' => [
        'add' => 'Añadir a :label',
        'block_max_items' => ':block solo se puede usar una vez.|:block se puede usar hasta :count veces.',
    ],
    'slider' => [
        'difference' => 'La diferencia entre los valores debe estar entre :min y :max.',
    ],
    'modal_table_select' => [
        'heading' => 'Seleccionar :label',
        'select' => 'Seleccionar',
    ],
    'translatable' => [
        'attribute' => ':attribute (:locale)',
        'editing_language' => 'Idioma de edición',
    ],
    'morph_to_select' => [
        'type' => 'Tipo',
    ],
    'icon_picker' => [
        'invalid' => 'El icono seleccionado no está disponible.',
    ],
];
