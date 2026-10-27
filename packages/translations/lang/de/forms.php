<?php

declare(strict_types=1);

return [
    'select' => [
        'boolean' => [
            'true' => 'Ja',
            'false' => 'Nein',
        ],
        'placeholder' => 'Option auswählen',
        'search_prompt' => 'Tippen Sie, um zu suchen…',
        'no_search_results' => 'Keine Optionen entsprechen Ihrer Suche.',
        'loading' => 'Wird geladen…',
    ],
    'key_value' => [
        'key' => 'Schlüssel',
        'value' => 'Wert',
        'add' => 'Zeile hinzufügen',
        'delete' => 'Zeile löschen',
        'reorder' => 'Neu anordnen',
    ],
    'repeater' => [
        'cannot_add' => 'Zu :attribute können keine Einträge hinzugefügt werden.',
        'cannot_delete' => 'Aus :attribute können keine Einträge entfernt werden.',
        'cannot_reorder' => 'Die Einträge in :attribute können nicht neu angeordnet werden.',
        'add' => 'Zu :label hinzufügen',
        'delete' => 'Löschen',
        'clone' => 'Duplizieren',
        'move_up' => 'Nach oben',
        'move_down' => 'Nach unten',
        'collapse' => 'Einklappen',
        'expand' => 'Ausklappen',
        'reorder' => 'Neu anordnen',
        'collapse_all' => 'Alle einklappen',
        'expand_all' => 'Alle ausklappen',
    ],
    'wizard' => [
        'next' => 'Weiter',
        'previous' => 'Zurück',
        'submit' => 'Absenden',
    ],
    'file_upload' => [
        'drop' => 'Dateien hierher ziehen oder',
        'browse' => 'durchsuchen',
        'uploading' => 'Wird hochgeladen…',
        'remove' => 'Entfernen',
        'download' => 'Herunterladen',
        'too_large' => 'Diese Datei ist zu groß.',
        'invalid_type' => 'Dieser Dateityp ist nicht erlaubt.',
        'too_small' => 'Diese Datei ist zu klein.',
        'unavailable' => 'Dieser Upload ist nicht mehr verfügbar. Lade die Datei erneut hoch.',
        'invalid_dimensions' => 'Die Bildabmessungen sind nicht erlaubt.',
        'invalid_aspect_ratio' => 'Das Seitenverhältnis des Bildes ist nicht erlaubt.',
        'chunk_failed' => 'Der Upload ist unvollständig. Lade die Datei erneut hoch.',
        'types' => [
            'images' => 'Bilder',
            'videos' => 'Videos',
            'audio' => 'Audiodateien',
            'text' => 'Textdateien',
        ],
    ],
    'tags_input' => [
        'placeholder' => 'Tag hinzufügen…',
    ],
    'rich_editor' => [
        'link_prompt' => 'URL eingeben',
        'insert_block' => ':block einfügen',
        'edit_block' => ':block bearbeiten',
        'save_block' => 'Speichern',
        'insert' => 'Einfügen',
        'text_colors' => [
            'red' => 'Rot',
            'orange' => 'Orange',
            'amber' => 'Bernstein',
            'green' => 'Grün',
            'teal' => 'Blaugrün',
            'blue' => 'Blau',
            'indigo' => 'Indigo',
            'purple' => 'Violett',
            'pink' => 'Pink',
            'gray' => 'Grau',
        ],
    ],
    'actions' => [
        'save' => 'Änderungen speichern',
        'create' => 'Erstellen',
        'create_another' => 'Erstellen & weiteres erstellen',
        'cancel' => 'Abbrechen',
        'saved' => 'Gespeichert',
        'created' => 'Erstellt',
    ],
    'builder' => [
        'add' => 'Zu :label hinzufügen',
        'block_max_items' => ':block kann nur einmal verwendet werden.|:block kann bis zu :count-mal verwendet werden.',
    ],
    'slider' => [
        'difference' => 'Die Werte müssen zwischen :min und :max auseinanderliegen.',
    ],
    'modal_table_select' => [
        'heading' => ':label auswählen',
        'select' => 'Auswählen',
    ],
    'translatable' => [
        'attribute' => ':attribute (:locale)',
        'editing_language' => 'Bearbeitungssprache',
    ],
    'morph_to_select' => [
        'type' => 'Typ',
    ],
    'icon_picker' => [
        'invalid' => 'Das ausgewählte Symbol ist nicht verfügbar.',
    ],
];
