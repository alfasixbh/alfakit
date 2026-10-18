<?php

declare(strict_types=1);

return [
    'sent' => 'Wir haben einen Link an :email gesendet. Ihre E-Mail-Adresse ändert sich, sobald Sie ihn öffnen.',
    'pending_heading' => 'E-Mail-Änderung ausstehend',
    'pending' => 'Öffnen Sie den Link, den wir an :email gesendet haben, um Ihre neue Adresse zu bestätigen.',
    'cancel' => 'Änderung abbrechen',
    'cancelled' => 'E-Mail-Änderung abgebrochen.',
    'verified' => 'Ihre E-Mail-Adresse wurde geändert.',
    'blocked' => 'Die E-Mail-Änderung wurde abgebrochen.',
    'invalid' => 'Dieser Link ist nicht mehr gültig.',
    'verify_mail' => [
        'subject' => 'Bestätigen Sie Ihre neue E-Mail-Adresse',
        'intro' => 'Klicken Sie auf die Schaltfläche, um diese Adresse für Ihr Konto zu verwenden.',
        'action' => 'E-Mail-Adresse bestätigen',
        'expiry' => '{1} Der Link läuft in :minutes Minute ab.|[2,*] Der Link läuft in :minutes Minuten ab.',
        'ignore' => 'Wenn Sie diese Änderung nicht angefordert haben, können Sie diese E-Mail ignorieren.',
    ],
    'notice_mail' => [
        'subject' => 'Änderung der E-Mail-Adresse angefordert',
        'intro' => 'Jemand hat angefordert, die E-Mail-Adresse Ihres Kontos in :email zu ändern.',
        'no_action' => 'Wenn Sie das waren, ist nichts weiter zu tun. Andernfalls brechen Sie die Änderung ab und ändern Sie Ihr Passwort.',
        'action' => 'Änderung abbrechen',
    ],
];
