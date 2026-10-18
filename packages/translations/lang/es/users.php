<?php

declare(strict_types=1);

return [
    'model_label' => 'usuario',
    'plural_model_label' => 'usuarios',
    'never' => 'Nunca',
    'sections' => [
        'account' => 'Cuenta',
        'security' => 'Seguridad',
    ],
    'fields' => [
        'name' => 'Nombre',
        'email' => 'Correo electrónico',
        'password' => 'Contraseña',
        'password_help' => 'Déjalo vacío para mantener la contraseña actual.',
        'password_confirmation' => 'Confirmar contraseña',
        'current_password' => 'Contraseña actual',
        'new_password' => 'Nueva contraseña',
        'password_change_required' => 'Exigir una nueva contraseña',
        'password_change_required_help' => 'El usuario deberá elegir una nueva contraseña la próxima vez que inicie sesión.',
        'roles' => 'Roles',
        'status' => 'Estado',
        'ban_reason' => 'Motivo',
        'created_at' => 'Creado',
        'last_login_at' => 'Último inicio de sesión',
        'last_login_ip' => 'IP del último inicio de sesión',
        'two_factor' => 'Autenticación en dos pasos',
    ],
    'status' => [
        'active' => 'Activo',
        'invited' => 'Invitado',
        'suspended' => 'Suspendido',
        'banned' => 'Bloqueado',
    ],
    'actions' => [
        'invite' => [
            'label' => 'Invitar usuario',
            'heading' => 'Invitar a un usuario',
            'description' => 'Recibirá un correo con un enlace para elegir su contraseña.',
            'submit' => 'Enviar invitación',
            'done' => 'Invitación enviada',
        ],
        'resend_invitation' => [
            'label' => 'Reenviar invitación',
            'done' => 'Invitación reenviada',
        ],
        'suspend' => [
            'label' => 'Suspender',
            'description' => 'Se cerrará la sesión del usuario y no podrá entrar hasta que lo reactives.',
            'done' => 'Usuario suspendido',
        ],
        'unsuspend' => [
            'label' => 'Reactivar',
            'done' => 'El usuario puede volver a iniciar sesión',
        ],
        'ban' => [
            'label' => 'Bloquear',
            'description' => 'Se cerrará la sesión del usuario y se le bloqueará el acceso al panel. El motivo solo lo ven los administradores.',
            'done' => 'Usuario bloqueado',
        ],
        'unban' => [
            'label' => 'Desbloquear',
            'done' => 'Bloqueo retirado',
        ],
        'require_password_change' => [
            'label' => 'Exigir una nueva contraseña',
            'description' => 'El usuario deberá elegir una nueva contraseña antes de volver a usar el panel.',
            'done' => 'Se pedirá al usuario una nueva contraseña',
        ],
        'reset_two_factor' => [
            'label' => 'Restablecer la autenticación en dos pasos',
            'description' => 'Desactiva todos los segundos factores y códigos de recuperación. El usuario inicia sesión con su contraseña y puede configurarlo de nuevo.',
            'done' => 'Autenticación en dos pasos restablecida',
        ],
        'revoke_session' => [
            'label' => 'Cerrar una sesión',
            'session' => 'Sesión',
            'done' => 'Sesión cerrada',
        ],
        'revoke_sessions' => [
            'label' => 'Cerrar sesión en todas partes',
            'description' => 'Finaliza todas las sesiones de este usuario en todos los dispositivos.',
            'done' => 'Sesión cerrada en todas partes',
        ],
    ],
    'blocked' => [
        'suspended' => 'Tu cuenta está suspendida. Contacta con un administrador.',
        'banned' => 'Tu cuenta ha sido bloqueada.',
    ],
    'invitation' => [
        'title' => 'Aceptar invitación',
        'heading' => 'Te damos la bienvenida a :app',
        'submit' => 'Establecer contraseña e iniciar sesión',
        'accepted' => '¡Bienvenido! Tu contraseña está lista.',
        'invalid' => 'Este enlace de invitación no es válido o ya se ha usado.',
        'mail' => [
            'subject' => 'Te han invitado a :app',
            'greeting' => '¡Hola!',
            'intro' => 'Te han invitado a :app. Elige una contraseña para activar tu cuenta.',
            'action' => 'Aceptar invitación',
            'expiry' => 'Este enlace caduca en :days días.',
        ],
    ],
    'change_password' => [
        'title' => 'Elige una nueva contraseña',
        'heading' => 'Elige una nueva contraseña',
        'description' => 'Un administrador te ha pedido que cambies tu contraseña antes de continuar.',
        'submit' => 'Guardar contraseña',
        'done' => 'Tu contraseña se ha cambiado.',
    ],
    'sessions' => [
        'heading' => 'Sesiones',
        'description' => 'Navegadores y dispositivos donde este usuario tiene la sesión iniciada.',
        'empty' => 'No hay sesiones activas',
        'device' => 'Dispositivo',
        'ip_address' => 'Dirección IP',
        'last_active' => 'Última actividad',
        'unknown_device' => 'Dispositivo desconocido',
    ],
];
