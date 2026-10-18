<?php

declare(strict_types=1);

return [
    'model_label' => 'utilisateur',
    'plural_model_label' => 'utilisateurs',
    'never' => 'Jamais',
    'sections' => [
        'account' => 'Compte',
        'security' => 'Sécurité',
    ],
    'fields' => [
        'name' => 'Nom',
        'email' => 'Adresse e-mail',
        'password' => 'Mot de passe',
        'password_help' => 'Laissez vide pour conserver le mot de passe actuel.',
        'password_confirmation' => 'Confirmer le mot de passe',
        'current_password' => 'Mot de passe actuel',
        'new_password' => 'Nouveau mot de passe',
        'password_change_required' => 'Exiger un nouveau mot de passe',
        'password_change_required_help' => 'L’utilisateur devra choisir un nouveau mot de passe à sa prochaine connexion.',
        'roles' => 'Rôles',
        'status' => 'Statut',
        'ban_reason' => 'Motif',
        'created_at' => 'Créé',
        'last_login_at' => 'Dernière connexion',
        'last_login_ip' => 'IP de la dernière connexion',
        'two_factor' => 'Authentification à deux facteurs',
    ],
    'status' => [
        'active' => 'Actif',
        'invited' => 'Invité',
        'suspended' => 'Suspendu',
        'banned' => 'Banni',
    ],
    'actions' => [
        'invite' => [
            'label' => 'Inviter un utilisateur',
            'heading' => 'Inviter un utilisateur',
            'description' => 'Il recevra un e-mail avec un lien pour choisir son mot de passe.',
            'submit' => 'Envoyer l’invitation',
            'done' => 'Invitation envoyée',
        ],
        'resend_invitation' => [
            'label' => 'Renvoyer l’invitation',
            'done' => 'Invitation renvoyée',
        ],
        'suspend' => [
            'label' => 'Suspendre',
            'description' => 'L’utilisateur est déconnecté et ne peut plus se connecter tant que vous ne le réactivez pas.',
            'done' => 'Utilisateur suspendu',
        ],
        'unsuspend' => [
            'label' => 'Réactiver',
            'done' => 'L’utilisateur peut à nouveau se connecter',
        ],
        'ban' => [
            'label' => 'Bannir',
            'description' => 'L’utilisateur est déconnecté et banni du panneau. Le motif n’est visible que des administrateurs.',
            'done' => 'Utilisateur banni',
        ],
        'unban' => [
            'label' => 'Lever le bannissement',
            'done' => 'Bannissement levé',
        ],
        'require_password_change' => [
            'label' => 'Exiger un nouveau mot de passe',
            'description' => 'L’utilisateur devra choisir un nouveau mot de passe avant de réutiliser le panneau.',
            'done' => 'Un nouveau mot de passe sera demandé à l’utilisateur',
        ],
        'reset_two_factor' => [
            'label' => 'Réinitialiser l’authentification à deux facteurs',
            'description' => 'Désactive tous les seconds facteurs et codes de récupération. L’utilisateur se connecte avec son mot de passe et peut le reconfigurer.',
            'done' => 'Authentification à deux facteurs réinitialisée',
        ],
        'revoke_session' => [
            'label' => 'Déconnecter une session',
            'session' => 'Session',
            'done' => 'Session déconnectée',
        ],
        'revoke_sessions' => [
            'label' => 'Déconnecter partout',
            'description' => 'Met fin à toutes les sessions de cet utilisateur sur tous ses appareils.',
            'done' => 'Déconnecté partout',
        ],
    ],
    'blocked' => [
        'suspended' => 'Votre compte est suspendu. Contactez un administrateur.',
        'banned' => 'Votre compte a été banni.',
    ],
    'invitation' => [
        'title' => 'Accepter l’invitation',
        'heading' => 'Bienvenue sur :app',
        'submit' => 'Définir le mot de passe et se connecter',
        'accepted' => 'Bienvenue ! Votre mot de passe est défini.',
        'invalid' => 'Ce lien d’invitation est invalide ou a déjà été utilisé.',
        'mail' => [
            'subject' => 'Vous êtes invité sur :app',
            'greeting' => 'Bonjour !',
            'intro' => 'Vous avez été invité sur :app. Choisissez un mot de passe pour activer votre compte.',
            'action' => 'Accepter l’invitation',
            'expiry' => 'Ce lien expire dans :days jours.',
        ],
    ],
    'change_password' => [
        'title' => 'Choisissez un nouveau mot de passe',
        'heading' => 'Choisissez un nouveau mot de passe',
        'description' => 'Un administrateur vous demande de changer votre mot de passe avant de continuer.',
        'submit' => 'Enregistrer le mot de passe',
        'done' => 'Votre mot de passe a été modifié.',
    ],
    'sessions' => [
        'heading' => 'Sessions',
        'description' => 'Navigateurs et appareils où cet utilisateur est connecté.',
        'empty' => 'Aucune session active',
        'device' => 'Appareil',
        'ip_address' => 'Adresse IP',
        'last_active' => 'Dernière activité',
        'unknown_device' => 'Appareil inconnu',
    ],
];
