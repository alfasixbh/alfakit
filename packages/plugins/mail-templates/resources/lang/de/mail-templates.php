<?php

declare(strict_types=1);

return [
    'label' => 'E-Mail-Vorlage',
    'plural_label' => 'E-Mail-Vorlagen',
    'navigation' => 'E-Mail-Vorlagen',
    'sections' => [
        'template' => 'E-Mail',
        'template_description' => 'Wählen Sie die E-Mail und die Sprache dieser Fassung.',
        'content' => 'Inhalt',
        'content_description' => 'Lassen Sie Betreff oder Inhalt leer, um den der E-Mail zu behalten.',
    ],
    'fields' => [
        'key' => 'E-Mail',
        'locale' => 'Sprache',
        'subject' => 'Betreff',
        'subject_help' => 'Platzhalter funktionieren auch hier, zum Beispiel {{ name }}.',
        'body' => 'Inhalt',
        'body_help' => 'Fügen Sie Platzhalter über die Werkzeugleiste ein; beim Versand werden sie durch die echten Werte ersetzt.',
        'merge_tags' => 'Platzhalter dieser E-Mail:',
        'status' => 'Status',
        'updated_at' => 'Aktualisiert',
    ],
    'statuses' => [
        'customized' => 'Angepasst',
        'default' => 'Standard',
    ],
    'empty' => [
        'heading' => 'Keine angepassten E-Mails',
        'description' => 'Passen Sie eine E-Mail an, um Betreff und Inhalt in einer Sprache zu ändern.',
    ],
    'actions' => [
        'preview' => [
            'label' => 'Vorschau',
            'close' => 'Schließen',
            'subject' => 'Betreff:',
            'light' => 'Hell',
            'dark' => 'Dunkel',
            'frame' => 'E-Mail-Vorschau (:variant)',
            'error' => 'Für diese E-Mail ist keine Vorschau möglich.',
        ],
        'send_test' => [
            'label' => 'Test senden',
            'modal_heading' => 'Test-E-Mail senden?',
            'modal_description' => 'Die gespeicherte Fassung wird mit Beispieldaten an Ihre eigene Adresse :email gesendet.',
            'submit' => 'Test senden',
            'sent' => 'Test-E-Mail an :email gesendet.',
            'no_email' => 'Ihr Konto hat keine E-Mail-Adresse für den Test.',
        ],
        'reset' => [
            'label' => 'Auf Standard zurücksetzen',
            'modal_heading' => 'Auf die Standard-E-Mail zurücksetzen?',
            'modal_description' => 'Die E-Mail erhält wieder ihren eigenen Betreff und Inhalt. Frühere Fassungen bleiben im Verlauf.',
            'submit' => 'Zurücksetzen',
            'done' => 'Die E-Mail ist wieder im Standardzustand.',
        ],
    ],
    'test' => [
        'subject' => '[Test] :subject',
    ],
    'validation' => [
        'unique' => 'Für diese E-Mail gibt es in dieser Sprache bereits eine Vorlage.',
        'unknown_tags' => ':tags ist kein Platzhalter dieser E-Mail.|:tags sind keine Platzhalter dieser E-Mail.',
    ],
];
