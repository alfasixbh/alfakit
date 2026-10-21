<?php

declare(strict_types=1);

return [
    'label' => 'e-mailsjabloon',
    'plural_label' => 'e-mailsjablonen',
    'navigation' => 'E-mailsjablonen',
    'sections' => [
        'template' => 'E-mail',
        'template_description' => 'Kies de e-mail en de taal van deze versie.',
        'content' => 'Inhoud',
        'content_description' => 'Laat het onderwerp of de inhoud leeg om die van de e-mail te houden.',
    ],
    'fields' => [
        'key' => 'E-mail',
        'locale' => 'Taal',
        'subject' => 'Onderwerp',
        'subject_help' => 'Samenvoegvelden werken hier ook, bijvoorbeeld :example.',
        'subject_help_without_example' => 'Samenvoegvelden werken hier ook.',
        'body' => 'Inhoud',
        'body_help' => 'Voeg samenvoegvelden in via de werkbalk; bij het verzenden worden ze vervangen door de echte waarden.',
        'merge_tags' => 'Samenvoegvelden van deze e-mail:',
        'status' => 'Status',
        'updated_at' => 'Bijgewerkt',
    ],
    'statuses' => [
        'customized' => 'Aangepast',
        'default' => 'Standaard',
    ],
    'empty' => [
        'heading' => 'Geen aangepaste e-mails',
        'description' => 'Pas een e-mail aan om het onderwerp en de inhoud in één taal te wijzigen.',
    ],
    'actions' => [
        'preview' => [
            'label' => 'Voorbeeld',
            'close' => 'Sluiten',
            'subject' => 'Onderwerp:',
            'light' => 'Licht',
            'dark' => 'Donker',
            'frame' => 'Voorbeeld van de e-mail (:variant)',
            'error' => 'Van deze e-mail kon geen voorbeeld worden gemaakt.',
        ],
        'send_test' => [
            'label' => 'Test versturen',
            'modal_heading' => 'Testmail versturen?',
            'modal_description' => 'De opgeslagen versie wordt met voorbeeldgegevens naar je eigen adres :email gestuurd.',
            'submit' => 'Test versturen',
            'sent' => 'Testmail verstuurd naar :email.',
            'no_email' => 'Je account heeft geen e-mailadres om de test naartoe te sturen.',
        ],
        'reset' => [
            'label' => 'Standaard herstellen',
            'modal_heading' => 'Standaard-e-mail herstellen?',
            'modal_description' => 'De e-mail krijgt weer zijn eigen onderwerp en inhoud. Eerdere versies blijven in de geschiedenis.',
            'submit' => 'Herstellen',
            'done' => 'De e-mail is weer de standaardversie.',
        ],
    ],
    'test' => [
        'subject' => '[Test] :subject',
    ],
    'validation' => [
        'unique' => 'Deze e-mail heeft al een sjabloon in deze taal.',
        'unknown_tags' => ':tags is geen samenvoegveld van deze e-mail.|:tags zijn geen samenvoegvelden van deze e-mail.',
    ],
];
