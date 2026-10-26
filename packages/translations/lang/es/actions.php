<?php

declare(strict_types=1);

return [
    'modal' => [
        'confirmation' => '¿Está seguro de que desea realizar esta acción?',
        'confirm' => 'Confirmar',
        'submit' => 'Enviar',
        'cancel' => 'Cancelar',
        'close' => 'Cerrar',
    ],
    'create' => [
        'label' => 'Crear :label',
        'modal' => [
            'heading' => 'Crear :label',
            'submit' => 'Crear',
        ],
        'notification' => 'Creado',
        'create_another' => 'Crear y crear otro',
    ],
    'edit' => [
        'label' => 'Editar',
        'modal' => [
            'heading' => 'Editar :label',
            'submit' => 'Guardar',
        ],
        'notification' => 'Guardado',
    ],
    'view' => [
        'label' => 'Ver',
        'modal' => [
            'heading' => 'Ver :label',
        ],
    ],
    'delete' => [
        'label' => 'Eliminar',
        'modal' => [
            'heading' => 'Eliminar :label',
            'submit' => 'Eliminar',
        ],
        'notification' => 'Eliminado',
        'bulk' => [
            'heading' => 'Eliminar registros seleccionados',
            'notification' => 'Eliminados',
        ],
    ],
    'restore' => [
        'label' => 'Restaurar',
        'modal' => [
            'heading' => 'Restaurar :label',
            'submit' => 'Restaurar',
        ],
        'notification' => 'Restaurado',
        'bulk' => [
            'heading' => 'Restaurar registros seleccionados',
            'notification' => 'Restaurados',
        ],
    ],
    'force_delete' => [
        'label' => 'Forzar eliminación',
        'modal' => [
            'heading' => 'Eliminar permanentemente :label',
            'description' => 'Esta acción no se puede deshacer.',
            'submit' => 'Eliminar',
        ],
        'notification' => 'Eliminado permanentemente',
        'bulk' => [
            'heading' => 'Eliminar permanentemente los registros seleccionados',
            'notification' => 'Eliminados permanentemente',
        ],
    ],
    'replicate' => [
        'label' => 'Duplicar',
        'modal' => [
            'heading' => 'Duplicar :label',
            'submit' => 'Duplicar',
        ],
        'notification' => 'Duplicado',
    ],
    'attach' => [
        'label' => 'Vincular',
        'modal' => [
            'heading' => 'Vincular :label',
            'submit' => 'Vincular',
        ],
        'notification' => 'Vinculado',
    ],
    'detach' => [
        'label' => 'Desvincular',
        'modal' => [
            'heading' => 'Desvincular :label',
            'submit' => 'Desvincular',
        ],
        'notification' => 'Desvinculado',
    ],
    'associate' => [
        'label' => 'Asociar',
        'modal' => [
            'heading' => 'Asociar :label',
            'submit' => 'Asociar',
        ],
        'notification' => 'Asociado',
    ],
    'dissociate' => [
        'label' => 'Desasociar',
        'modal' => [
            'heading' => 'Desasociar :label',
            'submit' => 'Desasociar',
        ],
        'notification' => 'Desasociado',
    ],
    'detach_bulk' => [
        'heading' => 'Desvincular los registros seleccionados',
        'notification' => 'Desvinculado',
    ],
    'dissociate_bulk' => [
        'heading' => 'Desasociar los registros seleccionados',
        'notification' => 'Desasociado',
    ],
    'rate_limited' => [
        'title' => 'Demasiados intentos',
        'body' => 'Espera :seconds segundo antes de volver a intentarlo.|Espera :seconds segundos antes de volver a intentarlo.',
    ],
    'password_confirmation' => [
        'incorrect' => 'La contraseña es incorrecta.',
        'throttled' => 'Demasiados intentos. Inténtalo de nuevo en :seconds segundos.',
    ],
    'bulk' => [
        'unauthorized_records' => 'Se omitió :count registro seleccionado porque no tienes permiso para modificarlo.|Se omitieron :count registros seleccionados porque no tienes permiso para modificarlos.',
        'all_failed' => 'No se pudo procesar el registro.|No se pudo procesar ninguno de los :count registros.',
        'some_failed' => 'No se pudo procesar :failure de :total registros.|No se pudieron procesar :failure de :total registros.',
    ],
    'history' => [
        'label' => 'Historial',
        'modal' => [
            'heading' => 'Historial de :label',
            'close' => 'Cerrar',
        ],
        'empty' => 'Todavía no hay versiones.',
        'events' => [
            'created' => 'Creado',
            'updated' => 'Actualizado',
            'deleted' => 'Eliminado',
            'restored' => 'Restaurado',
            'reverted' => 'Se restauró una versión anterior',
            'baseline' => 'Antes de que empezara el historial',
        ],
        'restore' => [
            'label' => 'Restaurar esta versión',
            'modal' => [
                'heading' => '¿Restaurar esta versión?',
                'description' => 'Los campos registrados vuelven a sus valores de esta versión. Los valores actuales se conservan en el historial.',
                'submit' => 'Restaurar',
            ],
            'notification' => 'Versión restaurada',
        ],
    ],
    'undo' => [
        'done' => 'Hecho',
        'notification' => 'Deshecho',
        'expired' => 'Ya no se puede deshacer.',
        'conflict' => 'El registro cambió desde entonces, así que no se puede deshacer.',
        'unavailable' => 'Ya no se puede deshacer porque el registro ya no existe.',
    ],
];
