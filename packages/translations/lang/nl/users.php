<?php

declare(strict_types=1);

return [
    'model_label' => 'gebruiker',
    'plural_model_label' => 'gebruikers',
    'never' => 'Nooit',
    'sections' => [
        'account' => 'Account',
        'security' => 'Beveiliging',
    ],
    'fields' => [
        'name' => 'Naam',
        'email' => 'E-mailadres',
        'password' => 'Wachtwoord',
        'password_help' => 'Laat leeg om het huidige wachtwoord te behouden.',
        'password_confirmation' => 'Bevestig wachtwoord',
        'current_password' => 'Huidig wachtwoord',
        'new_password' => 'Nieuw wachtwoord',
        'password_change_required' => 'Nieuw wachtwoord vereisen',
        'password_change_required_help' => 'De gebruiker moet bij de volgende aanmelding een nieuw wachtwoord kiezen.',
        'roles' => 'Rollen',
        'status' => 'Status',
        'ban_reason' => 'Reden',
        'created_at' => 'Aangemaakt',
        'last_login_at' => 'Laatste aanmelding',
        'last_login_ip' => 'IP van laatste aanmelding',
        'two_factor' => 'Tweestapsverificatie',
    ],
    'status' => [
        'active' => 'Actief',
        'invited' => 'Uitgenodigd',
        'suspended' => 'Geschorst',
        'banned' => 'Verbannen',
    ],
    'actions' => [
        'invite' => [
            'label' => 'Gebruiker uitnodigen',
            'heading' => 'Een gebruiker uitnodigen',
            'description' => 'Er volgt een e-mail met een link om een wachtwoord te kiezen.',
            'submit' => 'Uitnodiging versturen',
            'done' => 'Uitnodiging verstuurd',
        ],
        'resend_invitation' => [
            'label' => 'Uitnodiging opnieuw versturen',
            'done' => 'Uitnodiging opnieuw verstuurd',
        ],
        'suspend' => [
            'label' => 'Schorsen',
            'description' => 'De gebruiker wordt afgemeld en kan pas weer inloggen als je de schorsing opheft.',
            'done' => 'Gebruiker geschorst',
        ],
        'unsuspend' => [
            'label' => 'Schorsing opheffen',
            'done' => 'De gebruiker kan weer inloggen',
        ],
        'ban' => [
            'label' => 'Verbannen',
            'description' => 'De gebruiker wordt afgemeld en uit het paneel geweerd. De reden is alleen zichtbaar voor beheerders.',
            'done' => 'Gebruiker verbannen',
        ],
        'unban' => [
            'label' => 'Verbanning opheffen',
            'done' => 'Verbanning opgeheven',
        ],
        'require_password_change' => [
            'label' => 'Nieuw wachtwoord vereisen',
            'description' => 'De gebruiker moet een nieuw wachtwoord kiezen voordat hij het paneel weer kan gebruiken.',
            'done' => 'De gebruiker wordt om een nieuw wachtwoord gevraagd',
        ],
        'reset_two_factor' => [
            'label' => 'Tweestapsverificatie resetten',
            'description' => 'Schakelt alle tweede factoren en herstelcodes uit. De gebruiker logt in met zijn wachtwoord en kan het opnieuw instellen.',
            'done' => 'Tweestapsverificatie gereset',
        ],
        'revoke_session' => [
            'label' => 'Een sessie afmelden',
            'session' => 'Sessie',
            'done' => 'Sessie afgemeld',
        ],
        'revoke_sessions' => [
            'label' => 'Overal afmelden',
            'description' => 'Beëindigt alle sessies van deze gebruiker op alle apparaten.',
            'done' => 'Overal afgemeld',
        ],
    ],
    'blocked' => [
        'suspended' => 'Je account is geschorst. Neem contact op met een beheerder.',
        'banned' => 'Je account is verbannen.',
    ],
    'invitation' => [
        'title' => 'Uitnodiging accepteren',
        'heading' => 'Welkom bij :app',
        'submit' => 'Wachtwoord instellen en inloggen',
        'accepted' => 'Welkom! Je wachtwoord is ingesteld.',
        'invalid' => 'Deze uitnodigingslink is ongeldig of al gebruikt.',
        'mail' => [
            'subject' => 'Je bent uitgenodigd voor :app',
            'greeting' => 'Hallo!',
            'intro' => 'Je bent uitgenodigd voor :app. Kies een wachtwoord om je account te activeren.',
            'action' => 'Uitnodiging accepteren',
            'expiry' => 'Deze link verloopt over :days dagen.',
        ],
    ],
    'change_password' => [
        'title' => 'Kies een nieuw wachtwoord',
        'heading' => 'Kies een nieuw wachtwoord',
        'description' => 'Een beheerder heeft je gevraagd je wachtwoord te wijzigen voordat je verdergaat.',
        'submit' => 'Wachtwoord opslaan',
        'done' => 'Je wachtwoord is gewijzigd.',
    ],
    'sessions' => [
        'heading' => 'Sessies',
        'description' => 'Browsers en apparaten waarop deze gebruiker is ingelogd.',
        'empty' => 'Geen actieve sessies',
        'device' => 'Apparaat',
        'ip_address' => 'IP-adres',
        'last_active' => 'Laatst actief',
        'unknown_device' => 'Onbekend apparaat',
    ],
];
