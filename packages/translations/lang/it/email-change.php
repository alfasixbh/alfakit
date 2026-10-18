<?php

declare(strict_types=1);

return [
    'sent' => 'Abbiamo inviato un link a :email. Il tuo indirizzo cambierà quando lo aprirai.',
    'pending_heading' => 'Modifica email in sospeso',
    'pending' => 'Apri il link che abbiamo inviato a :email per confermare il nuovo indirizzo.',
    'cancel' => 'Annulla modifica',
    'cancelled' => 'Modifica email annullata.',
    'verified' => 'Il tuo indirizzo email è stato modificato.',
    'blocked' => 'La modifica dell’email è stata annullata.',
    'invalid' => 'Questo link non è più valido.',
    'verify_mail' => [
        'subject' => 'Conferma il nuovo indirizzo email',
        'intro' => 'Fai clic sul pulsante qui sotto per usare questo indirizzo per il tuo account.',
        'action' => 'Conferma indirizzo email',
        'expiry' => '{1} Il link scade tra :minutes minuto.|[2,*] Il link scade tra :minutes minuti.',
        'ignore' => 'Se non hai richiesto questa modifica, ignora questa email.',
    ],
    'notice_mail' => [
        'subject' => 'Richiesta di modifica dell’email',
        'intro' => 'Qualcuno ha chiesto di cambiare l’indirizzo email del tuo account in :email.',
        'no_action' => 'Se sei stato tu, non devi fare nulla. Altrimenti annulla la modifica e cambia la password.',
        'action' => 'Annulla la modifica',
    ],
];
