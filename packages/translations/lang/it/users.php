<?php

declare(strict_types=1);

return [
    'model_label' => 'utente',
    'plural_model_label' => 'utenti',
    'never' => 'Mai',
    'sections' => [
        'account' => 'Account',
        'security' => 'Sicurezza',
    ],
    'fields' => [
        'name' => 'Nome',
        'email' => 'Indirizzo email',
        'password' => 'Password',
        'password_help' => 'Lascia vuoto per mantenere la password attuale.',
        'password_confirmation' => 'Conferma password',
        'current_password' => 'Password attuale',
        'new_password' => 'Nuova password',
        'password_change_required' => 'Richiedi una nuova password',
        'password_change_required_help' => 'L’utente dovrà scegliere una nuova password al prossimo accesso.',
        'roles' => 'Ruoli',
        'status' => 'Stato',
        'ban_reason' => 'Motivo',
        'created_at' => 'Creato',
        'last_login_at' => 'Ultimo accesso',
        'last_login_ip' => 'IP dell’ultimo accesso',
        'two_factor' => 'Autenticazione a due fattori',
    ],
    'status' => [
        'active' => 'Attivo',
        'invited' => 'Invitato',
        'suspended' => 'Sospeso',
        'banned' => 'Bannato',
    ],
    'actions' => [
        'invite' => [
            'label' => 'Invita utente',
            'heading' => 'Invita un utente',
            'description' => 'Riceverà un’email con un link per scegliere la password.',
            'submit' => 'Invia invito',
            'done' => 'Invito inviato',
        ],
        'resend_invitation' => [
            'label' => 'Invia di nuovo l’invito',
            'done' => 'Invito inviato di nuovo',
        ],
        'suspend' => [
            'label' => 'Sospendi',
            'description' => 'L’utente viene disconnesso e non può accedere finché non lo riattivi.',
            'done' => 'Utente sospeso',
        ],
        'unsuspend' => [
            'label' => 'Riattiva',
            'done' => 'L’utente può accedere di nuovo',
        ],
        'ban' => [
            'label' => 'Banna',
            'description' => 'L’utente viene disconnesso e bloccato dal pannello. Il motivo è visibile solo agli amministratori.',
            'done' => 'Utente bannato',
        ],
        'unban' => [
            'label' => 'Revoca il ban',
            'done' => 'Ban revocato',
        ],
        'require_password_change' => [
            'label' => 'Richiedi una nuova password',
            'description' => 'L’utente dovrà scegliere una nuova password prima di usare di nuovo il pannello.',
            'done' => 'All’utente verrà chiesta una nuova password',
        ],
        'reset_two_factor' => [
            'label' => 'Reimposta l’autenticazione a due fattori',
            'description' => 'Disattiva tutti i secondi fattori e i codici di recupero. L’utente accede con la password e può configurarla di nuovo.',
            'done' => 'Autenticazione a due fattori reimpostata',
        ],
        'revoke_session' => [
            'label' => 'Disconnetti una sessione',
            'session' => 'Sessione',
            'done' => 'Sessione disconnessa',
        ],
        'revoke_sessions' => [
            'label' => 'Disconnetti ovunque',
            'description' => 'Termina tutte le sessioni di questo utente su tutti i dispositivi.',
            'done' => 'Disconnesso ovunque',
        ],
    ],
    'blocked' => [
        'suspended' => 'Il tuo account è sospeso. Contatta un amministratore.',
        'banned' => 'Il tuo account è stato bannato.',
    ],
    'invitation' => [
        'title' => 'Accetta l’invito',
        'heading' => 'Benvenuto in :app',
        'submit' => 'Imposta la password e accedi',
        'accepted' => 'Benvenuto! La tua password è impostata.',
        'invalid' => 'Questo link di invito non è valido o è già stato usato.',
        'mail' => [
            'subject' => 'Sei stato invitato su :app',
            'greeting' => 'Ciao!',
            'intro' => 'Sei stato invitato su :app. Scegli una password per attivare il tuo account.',
            'action' => 'Accetta l’invito',
            'expiry' => 'Questo link scade tra :days giorni.',
        ],
    ],
    'change_password' => [
        'title' => 'Scegli una nuova password',
        'heading' => 'Scegli una nuova password',
        'description' => 'Un amministratore ti ha chiesto di cambiare la password prima di continuare.',
        'submit' => 'Salva password',
        'done' => 'La tua password è stata cambiata.',
    ],
    'sessions' => [
        'heading' => 'Sessioni',
        'description' => 'Browser e dispositivi in cui questo utente ha effettuato l’accesso.',
        'empty' => 'Nessuna sessione attiva',
        'device' => 'Dispositivo',
        'ip_address' => 'Indirizzo IP',
        'last_active' => 'Ultima attività',
        'unknown_device' => 'Dispositivo sconosciuto',
    ],
];
