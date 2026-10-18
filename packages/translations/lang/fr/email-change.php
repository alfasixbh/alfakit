<?php

declare(strict_types=1);

return [
    'sent' => 'Nous avons envoyé un lien à :email. Votre adresse changera dès que vous l’ouvrirez.',
    'pending_heading' => 'Changement d’e-mail en attente',
    'pending' => 'Ouvrez le lien envoyé à :email pour confirmer votre nouvelle adresse.',
    'cancel' => 'Annuler le changement',
    'cancelled' => 'Changement d’e-mail annulé.',
    'verified' => 'Votre adresse e-mail a été modifiée.',
    'blocked' => 'Le changement d’e-mail a été annulé.',
    'invalid' => 'Ce lien n’est plus valide.',
    'verify_mail' => [
        'subject' => 'Confirmez votre nouvelle adresse e-mail',
        'intro' => 'Cliquez sur le bouton ci-dessous pour utiliser cette adresse pour votre compte.',
        'action' => 'Confirmer l’adresse e-mail',
        'expiry' => '{1} Le lien expire dans :minutes minute.|[2,*] Le lien expire dans :minutes minutes.',
        'ignore' => 'Si vous n’avez pas demandé ce changement, ignorez cet e-mail.',
    ],
    'notice_mail' => [
        'subject' => 'Demande de changement d’e-mail',
        'intro' => 'Quelqu’un a demandé à remplacer l’adresse e-mail de votre compte par :email.',
        'no_action' => 'Si c’était vous, vous n’avez rien à faire. Sinon, annulez le changement et modifiez votre mot de passe.',
        'action' => 'Annuler le changement',
    ],
];
