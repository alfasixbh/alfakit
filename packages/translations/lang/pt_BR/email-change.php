<?php

declare(strict_types=1);

return [
    'sent' => 'Enviamos um link para :email. Seu endereço muda quando você abri-lo.',
    'pending_heading' => 'Alteração de e-mail pendente',
    'pending' => 'Abra o link que enviamos para :email para confirmar seu novo endereço.',
    'cancel' => 'Cancelar alteração',
    'cancelled' => 'Alteração de e-mail cancelada.',
    'verified' => 'Seu endereço de e-mail foi alterado.',
    'blocked' => 'A alteração de e-mail foi cancelada.',
    'invalid' => 'Este link não é mais válido.',
    'verify_mail' => [
        'subject' => 'Confirme seu novo endereço de e-mail',
        'intro' => 'Clique no botão abaixo para usar este endereço na sua conta.',
        'action' => 'Confirmar endereço de e-mail',
        'expiry' => '{1} O link expira em :minutes minuto.|[2,*] O link expira em :minutes minutos.',
        'ignore' => 'Se você não pediu esta alteração, ignore este e-mail.',
    ],
    'notice_mail' => [
        'subject' => 'Alteração de e-mail solicitada',
        'intro' => 'Alguém pediu para alterar o e-mail da sua conta para :email.',
        'no_action' => 'Se foi você, não é preciso fazer nada. Caso contrário, cancele a alteração e mude sua senha.',
        'action' => 'Cancelar a alteração',
    ],
];
