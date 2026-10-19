<?php

declare(strict_types=1);

return [

    'notifications' => [
        'saved' => 'Reihenfolge gespeichert',
    ],

    // Node buttons: they name the node, like the move buttons.
    'actions' => [
        'view' => ':title anzeigen',
        'edit' => ':title bearbeiten',
        'delete' => ':title löschen',
    ],

    'validation' => [
        'invalid' => 'Der Baum konnte nicht gelesen werden.',
        'unknown_record' => 'Ein Datensatz im Baum existiert nicht mehr. Laden Sie die Seite neu und versuchen Sie es erneut.',
        'duplicate_record' => 'Ein Datensatz kommt mehrmals im Baum vor.',
        'unknown_parent' => 'Ein übergeordneter Datensatz existiert nicht mehr. Laden Sie die Seite neu und versuchen Sie es erneut.',
        'cycle' => 'Ein Datensatz kann nicht in sich selbst verschoben werden.',
        'max_depth' => 'Der Baum darf höchstens :depth Ebenen tief sein.',
    ],

    // Shared with the renderers as `tree.*` (see TreePlugin::register()).
    'ui' => [
        'label' => 'Baum',
        'expand_all' => 'Alle ausklappen',
        'collapse_all' => 'Alle einklappen',
        'expand' => ':title ausklappen',
        'collapse' => ':title einklappen',
        'move_up' => ':title nach oben verschieben',
        'move_down' => ':title nach unten verschieben',
        'indent' => ':title in das Element darüber verschieben',
        'outdent' => ':title aus dem übergeordneten Element herausnehmen',
        'save' => 'Reihenfolge speichern',
        'saving' => 'Wird gespeichert…',
        'discard' => 'Änderungen verwerfen',
        'unsaved' => 'Sie haben ungespeicherte Änderungen an der Reihenfolge.',
        'save_failed' => 'Die Reihenfolge konnte nicht gespeichert werden.',
        'empty' => 'Noch keine Datensätze',
        'moved' => ':title an Position :position von :count verschoben, Ebene :level.',
    ],

];
