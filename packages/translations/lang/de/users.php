<?php

declare(strict_types=1);

return [
    'model_label' => 'Benutzer',
    'plural_model_label' => 'Benutzer',
    'never' => 'Nie',
    'sections' => [
        'account' => 'Konto',
        'security' => 'Sicherheit',
    ],
    'fields' => [
        'name' => 'Name',
        'email' => 'E-Mail-Adresse',
        'password' => 'Passwort',
        'password_help' => 'Leer lassen, um das aktuelle Passwort zu behalten.',
        'password_confirmation' => 'Passwort bestätigen',
        'current_password' => 'Aktuelles Passwort',
        'new_password' => 'Neues Passwort',
        'password_change_required' => 'Neues Passwort verlangen',
        'password_change_required_help' => 'Der Benutzer muss bei der nächsten Anmeldung ein neues Passwort wählen.',
        'roles' => 'Rollen',
        'status' => 'Status',
        'ban_reason' => 'Grund',
        'created_at' => 'Erstellt',
        'last_login_at' => 'Letzte Anmeldung',
        'last_login_ip' => 'IP der letzten Anmeldung',
        'two_factor' => 'Zwei-Faktor-Authentifizierung',
    ],
    'status' => [
        'active' => 'Aktiv',
        'invited' => 'Eingeladen',
        'suspended' => 'Gesperrt',
        'banned' => 'Gebannt',
    ],
    'actions' => [
        'invite' => [
            'label' => 'Benutzer einladen',
            'heading' => 'Einen Benutzer einladen',
            'description' => 'Sie erhalten eine E-Mail mit einem Link, um ihr Passwort festzulegen.',
            'submit' => 'Einladung senden',
            'done' => 'Einladung gesendet',
        ],
        'resend_invitation' => [
            'label' => 'Einladung erneut senden',
            'done' => 'Einladung erneut gesendet',
        ],
        'suspend' => [
            'label' => 'Sperren',
            'description' => 'Der Benutzer wird abgemeldet und kann sich erst nach der Entsperrung wieder anmelden.',
            'done' => 'Benutzer gesperrt',
        ],
        'unsuspend' => [
            'label' => 'Entsperren',
            'done' => 'Der Benutzer kann sich wieder anmelden',
        ],
        'ban' => [
            'label' => 'Bannen',
            'description' => 'Der Benutzer wird abgemeldet und vom Panel ausgeschlossen. Der Grund ist nur für Admins sichtbar.',
            'done' => 'Benutzer gebannt',
        ],
        'unban' => [
            'label' => 'Bann aufheben',
            'done' => 'Bann aufgehoben',
        ],
        'require_password_change' => [
            'label' => 'Neues Passwort verlangen',
            'description' => 'Der Benutzer muss ein neues Passwort wählen, bevor er das Panel wieder nutzen kann.',
            'done' => 'Der Benutzer wird nach einem neuen Passwort gefragt',
        ],
        'reset_two_factor' => [
            'label' => 'Zwei-Faktor-Authentifizierung zurücksetzen',
            'description' => 'Schaltet alle zweiten Faktoren und Wiederherstellungscodes ab. Der Benutzer meldet sich mit seinem Passwort an und kann sie neu einrichten.',
            'done' => 'Zwei-Faktor-Authentifizierung zurückgesetzt',
        ],
        'revoke_session' => [
            'label' => 'Eine Sitzung abmelden',
            'session' => 'Sitzung',
            'done' => 'Sitzung abgemeldet',
        ],
        'revoke_sessions' => [
            'label' => 'Überall abmelden',
            'description' => 'Beendet alle Sitzungen dieses Benutzers auf allen Geräten.',
            'done' => 'Überall abgemeldet',
        ],
    ],
    'blocked' => [
        'suspended' => 'Dein Konto ist gesperrt. Wende dich an einen Administrator.',
        'banned' => 'Dein Konto wurde gebannt.',
    ],
    'invitation' => [
        'title' => 'Einladung annehmen',
        'heading' => 'Willkommen bei :app',
        'submit' => 'Passwort festlegen und anmelden',
        'accepted' => 'Willkommen! Dein Passwort ist festgelegt.',
        'invalid' => 'Dieser Einladungslink ist ungültig oder wurde bereits verwendet.',
        'mail' => [
            'subject' => 'Du bist zu :app eingeladen',
            'greeting' => 'Hallo!',
            'intro' => 'Du wurdest zu :app eingeladen. Wähle ein Passwort, um dein Konto zu aktivieren.',
            'action' => 'Einladung annehmen',
            'expiry' => 'Dieser Link läuft in :days Tagen ab.',
        ],
    ],
    'change_password' => [
        'title' => 'Neues Passwort wählen',
        'heading' => 'Neues Passwort wählen',
        'description' => 'Ein Administrator hat dich gebeten, dein Passwort zu ändern, bevor du fortfährst.',
        'submit' => 'Passwort speichern',
        'done' => 'Dein Passwort wurde geändert.',
    ],
    'sessions' => [
        'heading' => 'Sitzungen',
        'description' => 'Browser und Geräte, auf denen dieser Benutzer angemeldet ist.',
        'empty' => 'Keine aktiven Sitzungen',
        'device' => 'Gerät',
        'ip_address' => 'IP-Adresse',
        'last_active' => 'Zuletzt aktiv',
        'unknown_device' => 'Unbekanntes Gerät',
    ],
];
