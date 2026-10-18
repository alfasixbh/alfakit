<?php

declare(strict_types=1);

return [
    'sent' => 'Enviamos un enlace a :email. Tu dirección cambiará cuando lo abras.',
    'pending_heading' => 'Cambio de correo pendiente',
    'pending' => 'Abre el enlace que enviamos a :email para confirmar tu nueva dirección.',
    'cancel' => 'Cancelar el cambio',
    'cancelled' => 'Cambio de correo cancelado.',
    'verified' => 'Tu dirección de correo ha cambiado.',
    'blocked' => 'El cambio de correo se ha cancelado.',
    'invalid' => 'Este enlace ya no es válido.',
    'verify_mail' => [
        'subject' => 'Confirma tu nueva dirección de correo',
        'intro' => 'Haz clic en el botón para usar esta dirección en tu cuenta.',
        'action' => 'Confirmar dirección de correo',
        'expiry' => '{1} El enlace caduca en :minutes minuto.|[2,*] El enlace caduca en :minutes minutos.',
        'ignore' => 'Si no pediste este cambio, puedes ignorar este correo.',
    ],
    'notice_mail' => [
        'subject' => 'Solicitud de cambio de correo',
        'intro' => 'Alguien ha pedido cambiar la dirección de correo de tu cuenta a :email.',
        'no_action' => 'Si fuiste tú, no tienes que hacer nada. Si no, cancela el cambio y cambia tu contraseña.',
        'action' => 'Cancelar el cambio',
    ],
];
