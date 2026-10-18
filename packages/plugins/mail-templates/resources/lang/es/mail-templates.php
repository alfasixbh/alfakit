<?php

declare(strict_types=1);

return [
    'label' => 'plantilla de correo',
    'plural_label' => 'plantillas de correo',
    'navigation' => 'Plantillas de correo',
    'sections' => [
        'template' => 'Correo',
        'template_description' => 'Elige el correo y el idioma de esta versión.',
        'content' => 'Contenido',
        'content_description' => 'Deja el asunto o el contenido vacío para conservar el del correo.',
    ],
    'fields' => [
        'key' => 'Correo',
        'locale' => 'Idioma',
        'subject' => 'Asunto',
        'subject_help' => 'Las etiquetas de combinación también funcionan aquí, por ejemplo {{ name }}.',
        'body' => 'Contenido',
        'body_help' => 'Inserta etiquetas de combinación desde la barra de herramientas; se sustituyen por los valores reales al enviar el correo.',
        'merge_tags' => 'Etiquetas de combinación de este correo:',
        'status' => 'Estado',
        'updated_at' => 'Actualizado',
    ],
    'statuses' => [
        'customized' => 'Personalizado',
        'default' => 'Predeterminado',
    ],
    'empty' => [
        'heading' => 'No hay correos personalizados',
        'description' => 'Personaliza un correo para cambiar su asunto y contenido en un idioma.',
    ],
    'actions' => [
        'preview' => [
            'label' => 'Vista previa',
            'close' => 'Cerrar',
            'subject' => 'Asunto:',
            'light' => 'Claro',
            'dark' => 'Oscuro',
            'frame' => 'Vista previa del correo (:variant)',
            'error' => 'No se pudo generar la vista previa de este correo.',
        ],
        'send_test' => [
            'label' => 'Enviar prueba',
            'modal_heading' => '¿Enviar un correo de prueba?',
            'modal_description' => 'La versión guardada se envía con datos de ejemplo a tu propia dirección, :email.',
            'submit' => 'Enviar prueba',
            'sent' => 'Correo de prueba enviado a :email.',
            'no_email' => 'Tu cuenta no tiene una dirección de correo a la que enviar la prueba.',
        ],
        'reset' => [
            'label' => 'Restablecer predeterminado',
            'modal_heading' => '¿Restablecer el correo predeterminado?',
            'modal_description' => 'El correo vuelve a su propio asunto y contenido. Las versiones anteriores quedan en el historial.',
            'submit' => 'Restablecer',
            'done' => 'El correo vuelve a ser el predeterminado.',
        ],
    ],
    'test' => [
        'subject' => '[Prueba] :subject',
    ],
    'validation' => [
        'unique' => 'Este correo ya tiene una plantilla en este idioma.',
        'unknown_tags' => ':tags no es una etiqueta de combinación de este correo.|:tags no son etiquetas de combinación de este correo.',
    ],
];
