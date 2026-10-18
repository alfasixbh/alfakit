<?php

declare(strict_types=1);

return [
    'model_label' => 'usuário',
    'plural_model_label' => 'usuários',
    'never' => 'Nunca',
    'sections' => [
        'account' => 'Conta',
        'security' => 'Segurança',
    ],
    'fields' => [
        'name' => 'Nome',
        'email' => 'Endereço de e-mail',
        'password' => 'Senha',
        'password_help' => 'Deixe em branco para manter a senha atual.',
        'password_confirmation' => 'Confirmar senha',
        'current_password' => 'Senha atual',
        'new_password' => 'Nova senha',
        'password_change_required' => 'Exigir uma nova senha',
        'password_change_required_help' => 'O usuário precisará escolher uma nova senha no próximo acesso.',
        'roles' => 'Funções',
        'status' => 'Status',
        'ban_reason' => 'Motivo',
        'created_at' => 'Criado',
        'last_login_at' => 'Último acesso',
        'last_login_ip' => 'IP do último acesso',
        'two_factor' => 'Autenticação em dois fatores',
    ],
    'status' => [
        'active' => 'Ativo',
        'invited' => 'Convidado',
        'suspended' => 'Suspenso',
        'banned' => 'Banido',
    ],
    'actions' => [
        'invite' => [
            'label' => 'Convidar usuário',
            'heading' => 'Convidar um usuário',
            'description' => 'A pessoa receberá um e-mail com um link para escolher a senha.',
            'submit' => 'Enviar convite',
            'done' => 'Convite enviado',
        ],
        'resend_invitation' => [
            'label' => 'Reenviar convite',
            'done' => 'Convite reenviado',
        ],
        'suspend' => [
            'label' => 'Suspender',
            'description' => 'O usuário será desconectado e não poderá entrar até que você o reative.',
            'done' => 'Usuário suspenso',
        ],
        'unsuspend' => [
            'label' => 'Reativar',
            'done' => 'O usuário pode entrar novamente',
        ],
        'ban' => [
            'label' => 'Banir',
            'description' => 'O usuário será desconectado e bloqueado no painel. O motivo é visível apenas para administradores.',
            'done' => 'Usuário banido',
        ],
        'unban' => [
            'label' => 'Remover banimento',
            'done' => 'Banimento removido',
        ],
        'require_password_change' => [
            'label' => 'Exigir uma nova senha',
            'description' => 'O usuário precisará escolher uma nova senha antes de voltar a usar o painel.',
            'done' => 'Uma nova senha será solicitada ao usuário',
        ],
        'reset_two_factor' => [
            'label' => 'Redefinir a autenticação em dois fatores',
            'description' => 'Desativa todos os segundos fatores e códigos de recuperação. O usuário entra com a senha e pode configurar novamente.',
            'done' => 'Autenticação em dois fatores redefinida',
        ],
        'revoke_session' => [
            'label' => 'Encerrar uma sessão',
            'session' => 'Sessão',
            'done' => 'Sessão encerrada',
        ],
        'revoke_sessions' => [
            'label' => 'Sair de todos os lugares',
            'description' => 'Encerra todas as sessões deste usuário em todos os dispositivos.',
            'done' => 'Desconectado de todos os lugares',
        ],
    ],
    'blocked' => [
        'suspended' => 'Sua conta está suspensa. Entre em contato com um administrador.',
        'banned' => 'Sua conta foi banida.',
    ],
    'invitation' => [
        'title' => 'Aceitar convite',
        'heading' => 'Boas-vindas ao :app',
        'submit' => 'Definir senha e entrar',
        'accepted' => 'Boas-vindas! Sua senha foi definida.',
        'invalid' => 'Este link de convite é inválido ou já foi usado.',
        'mail' => [
            'subject' => 'Você foi convidado para o :app',
            'greeting' => 'Olá!',
            'intro' => 'Você foi convidado para o :app. Escolha uma senha para ativar sua conta.',
            'action' => 'Aceitar convite',
            'expiry' => 'Este link expira em :days dias.',
        ],
    ],
    'change_password' => [
        'title' => 'Escolha uma nova senha',
        'heading' => 'Escolha uma nova senha',
        'description' => 'Um administrador pediu que você altere sua senha antes de continuar.',
        'submit' => 'Salvar senha',
        'done' => 'Sua senha foi alterada.',
    ],
    'sessions' => [
        'heading' => 'Sessões',
        'description' => 'Navegadores e dispositivos em que este usuário está conectado.',
        'empty' => 'Nenhuma sessão ativa',
        'device' => 'Dispositivo',
        'ip_address' => 'Endereço IP',
        'last_active' => 'Última atividade',
        'unknown_device' => 'Dispositivo desconhecido',
    ],
];
