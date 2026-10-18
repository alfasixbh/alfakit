<?php

declare(strict_types=1);

return [
    'label' => 'modèle d’e-mail',
    'plural_label' => 'modèles d’e-mail',
    'navigation' => 'Modèles d’e-mail',
    'sections' => [
        'template' => 'E-mail',
        'template_description' => 'Choisissez l’e-mail et la langue de cette version.',
        'content' => 'Contenu',
        'content_description' => 'Laissez l’objet ou le contenu vide pour garder celui de l’e-mail.',
    ],
    'fields' => [
        'key' => 'E-mail',
        'locale' => 'Langue',
        'subject' => 'Objet',
        'subject_help' => 'Les balises de fusion fonctionnent aussi ici, par exemple {{ name }}.',
        'body' => 'Contenu',
        'body_help' => 'Insérez des balises de fusion depuis la barre d’outils ; elles sont remplacées par les vraies valeurs à l’envoi.',
        'merge_tags' => 'Balises de fusion de cet e-mail :',
        'status' => 'Statut',
        'updated_at' => 'Mis à jour',
    ],
    'statuses' => [
        'customized' => 'Personnalisé',
        'default' => 'Par défaut',
    ],
    'empty' => [
        'heading' => 'Aucun e-mail personnalisé',
        'description' => 'Personnalisez un e-mail pour changer son objet et son contenu dans une langue.',
    ],
    'actions' => [
        'preview' => [
            'label' => 'Aperçu',
            'close' => 'Fermer',
            'subject' => 'Objet :',
            'light' => 'Clair',
            'dark' => 'Sombre',
            'frame' => 'Aperçu de l’e-mail (:variant)',
            'error' => 'Impossible d’afficher l’aperçu de cet e-mail.',
        ],
        'send_test' => [
            'label' => 'Envoyer un test',
            'modal_heading' => 'Envoyer un e-mail de test ?',
            'modal_description' => 'La version enregistrée est envoyée avec des données d’exemple à votre propre adresse, :email.',
            'submit' => 'Envoyer le test',
            'sent' => 'E-mail de test envoyé à :email.',
            'no_email' => 'Votre compte n’a pas d’adresse e-mail pour recevoir le test.',
        ],
        'reset' => [
            'label' => 'Rétablir par défaut',
            'modal_heading' => 'Rétablir l’e-mail par défaut ?',
            'modal_description' => 'L’e-mail retrouve son propre objet et son contenu. Les versions précédentes restent dans l’historique.',
            'submit' => 'Rétablir',
            'done' => 'L’e-mail est revenu à sa version par défaut.',
        ],
    ],
    'test' => [
        'subject' => '[Test] :subject',
    ],
    'validation' => [
        'unique' => 'Cet e-mail a déjà un modèle dans cette langue.',
        'unknown_tags' => ':tags n’est pas une balise de fusion de cet e-mail.|:tags ne sont pas des balises de fusion de cet e-mail.',
    ],
];
