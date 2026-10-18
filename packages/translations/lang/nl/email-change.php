<?php

declare(strict_types=1);

return [
    'sent' => 'We hebben een link naar :email gestuurd. Je e-mailadres verandert zodra je die opent.',
    'pending_heading' => 'E-mailwijziging in behandeling',
    'pending' => 'Open de link die we naar :email hebben gestuurd om je nieuwe adres te bevestigen.',
    'cancel' => 'Wijziging annuleren',
    'cancelled' => 'E-mailwijziging geannuleerd.',
    'verified' => 'Je e-mailadres is gewijzigd.',
    'blocked' => 'De e-mailwijziging is geannuleerd.',
    'invalid' => 'Deze link is niet meer geldig.',
    'verify_mail' => [
        'subject' => 'Bevestig je nieuwe e-mailadres',
        'intro' => 'Klik op de knop hieronder om dit adres voor je account te gebruiken.',
        'action' => 'E-mailadres bevestigen',
        'expiry' => '{1} De link verloopt over :minutes minuut.|[2,*] De link verloopt over :minutes minuten.',
        'ignore' => 'Heb je deze wijziging niet aangevraagd? Dan kun je deze e-mail negeren.',
    ],
    'notice_mail' => [
        'subject' => 'E-mailwijziging aangevraagd',
        'intro' => 'Iemand heeft gevraagd het e-mailadres van je account te wijzigen in :email.',
        'no_action' => 'Was jij dit, dan hoef je niets te doen. Zo niet, annuleer de wijziging en wijzig je wachtwoord.',
        'action' => 'Wijziging annuleren',
    ],
];
