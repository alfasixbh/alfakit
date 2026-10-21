<?php

declare(strict_types=1);

return [
    'label' => 'modello email',
    'plural_label' => 'modelli email',
    'navigation' => 'Modelli email',
    'sections' => [
        'template' => 'Email',
        'template_description' => 'Scegli l’email e la lingua di questa versione.',
        'content' => 'Contenuto',
        'content_description' => 'Lascia vuoti oggetto o contenuto per mantenere quelli dell’email.',
    ],
    'fields' => [
        'key' => 'Email',
        'locale' => 'Lingua',
        'subject' => 'Oggetto',
        'subject_help' => 'I tag di unione funzionano anche qui, per esempio :example.',
        'subject_help_without_example' => 'I tag di unione funzionano anche qui.',
        'body' => 'Contenuto',
        'body_help' => 'Inserisci i tag di unione dalla barra degli strumenti; all’invio vengono sostituiti dai valori reali.',
        'merge_tags' => 'Tag di unione di questa email:',
        'status' => 'Stato',
        'updated_at' => 'Aggiornato',
    ],
    'statuses' => [
        'customized' => 'Personalizzato',
        'default' => 'Predefinito',
    ],
    'empty' => [
        'heading' => 'Nessuna email personalizzata',
        'description' => 'Personalizza un’email per cambiarne oggetto e contenuto in una lingua.',
    ],
    'actions' => [
        'preview' => [
            'label' => 'Anteprima',
            'close' => 'Chiudi',
            'subject' => 'Oggetto:',
            'light' => 'Chiaro',
            'dark' => 'Scuro',
            'frame' => 'Anteprima email (:variant)',
            'error' => 'Impossibile mostrare l’anteprima di questa email.',
        ],
        'send_test' => [
            'label' => 'Invia prova',
            'modal_heading' => 'Inviare un’email di prova?',
            'modal_description' => 'La versione salvata viene inviata con dati di esempio al tuo indirizzo, :email.',
            'submit' => 'Invia prova',
            'sent' => 'Email di prova inviata a :email.',
            'no_email' => 'Il tuo account non ha un indirizzo email a cui inviare la prova.',
        ],
        'reset' => [
            'label' => 'Ripristina predefinito',
            'modal_heading' => 'Ripristinare l’email predefinita?',
            'modal_description' => 'L’email torna al suo oggetto e contenuto originali. Le versioni precedenti restano nella cronologia.',
            'submit' => 'Ripristina',
            'done' => 'L’email è tornata a quella predefinita.',
        ],
    ],
    'test' => [
        'subject' => '[Prova] :subject',
    ],
    'validation' => [
        'unique' => 'Questa email ha già un modello in questa lingua.',
        'unknown_tags' => ':tags non è un tag di unione di questa email.|:tags non sono tag di unione di questa email.',
    ],
];
