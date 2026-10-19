<?php

declare(strict_types=1);

return [

    'notifications' => [
        'saved' => 'Volgorde opgeslagen',
    ],

    // Node buttons: they name the node, like the move buttons.
    'actions' => [
        'view' => ':title bekijken',
        'edit' => ':title bewerken',
        'delete' => ':title verwijderen',
    ],

    'validation' => [
        'invalid' => 'De boom kon niet worden gelezen.',
        'unknown_record' => 'Een record in de boom bestaat niet meer. Laad de pagina opnieuw en probeer het nogmaals.',
        'duplicate_record' => 'Een record komt meer dan eens voor in de boom.',
        'unknown_parent' => 'Een bovenliggend record bestaat niet meer. Laad de pagina opnieuw en probeer het nogmaals.',
        'cycle' => 'Een record kan niet in zichzelf worden verplaatst.',
        'max_depth' => 'De boom mag maximaal :depth niveaus diep zijn.',
    ],

    // Shared with the renderers as `tree.*` (see TreePlugin::register()).
    'ui' => [
        'label' => 'Boom',
        'expand_all' => 'Alles uitklappen',
        'collapse_all' => 'Alles inklappen',
        'expand' => ':title uitklappen',
        'collapse' => ':title inklappen',
        'move_up' => ':title omhoog verplaatsen',
        'move_down' => ':title omlaag verplaatsen',
        'indent' => ':title in het item erboven plaatsen',
        'outdent' => ':title uit het bovenliggende item halen',
        'save' => 'Volgorde opslaan',
        'saving' => 'Opslaan…',
        'discard' => 'Wijzigingen negeren',
        'unsaved' => 'Je hebt niet-opgeslagen wijzigingen in de volgorde.',
        'save_failed' => 'De volgorde kon niet worden opgeslagen.',
        'empty' => 'Nog geen records',
        'moved' => ':title verplaatst naar positie :position van :count, niveau :level.',
    ],

];
