<?php

declare(strict_types=1);

return [
    'select' => [
        'boolean' => [
            'true' => 'Ja',
            'false' => 'Nee',
        ],
        'placeholder' => 'Selecteer een optie',
        'search_prompt' => 'Begin met typen om te zoeken…',
        'no_search_results' => 'Geen opties gevonden voor je zoekopdracht.',
        'loading' => 'Laden…',
    ],
    'key_value' => [
        'key' => 'Sleutel',
        'value' => 'Waarde',
        'add' => 'Rij toevoegen',
        'delete' => 'Rij verwijderen',
        'reorder' => 'Herschikken',
    ],
    'repeater' => [
        'cannot_add' => 'Er kunnen geen items aan :attribute worden toegevoegd.',
        'cannot_delete' => 'Er kunnen geen items uit :attribute worden verwijderd.',
        'cannot_reorder' => 'De items in :attribute kunnen niet opnieuw worden gerangschikt.',
        'add' => 'Toevoegen aan :label',
        'delete' => 'Verwijderen',
        'clone' => 'Dupliceren',
        'move_up' => 'Omhoog',
        'move_down' => 'Omlaag',
        'collapse' => 'Inklappen',
        'expand' => 'Uitklappen',
        'reorder' => 'Herschikken',
        'collapse_all' => 'Alles inklappen',
        'expand_all' => 'Alles uitklappen',
    ],
    'wizard' => [
        'next' => 'Volgende',
        'previous' => 'Terug',
        'submit' => 'Verzenden',
    ],
    'file_upload' => [
        'drop' => 'Sleep bestanden hierheen of',
        'browse' => 'blader',
        'uploading' => 'Uploaden…',
        'remove' => 'Verwijderen',
        'download' => 'Downloaden',
        'too_large' => 'Dit bestand is te groot.',
        'invalid_type' => 'Dit bestandstype is niet toegestaan.',
        'too_small' => 'Dit bestand is te klein.',
        'unavailable' => 'Deze upload is niet meer beschikbaar. Upload het bestand opnieuw.',
        'invalid_dimensions' => 'De afmetingen van de afbeelding zijn niet toegestaan.',
        'invalid_aspect_ratio' => 'De beeldverhouding van de afbeelding is niet toegestaan.',
        'chunk_failed' => 'De upload is onvolledig. Upload het bestand opnieuw.',
        'types' => [
            'images' => 'Afbeeldingen',
            'videos' => 'Video\'s',
            'audio' => 'Audiobestanden',
            'text' => 'Tekstbestanden',
        ],
    ],
    'tags_input' => [
        'placeholder' => 'Tag toevoegen…',
    ],
    'rich_editor' => [
        'link_prompt' => 'Voer een URL in',
        'insert_block' => ':block invoegen',
        'edit_block' => ':block bewerken',
        'save_block' => 'Opslaan',
        'insert' => 'Invoegen',
        'text_colors' => [
            'red' => 'Rood',
            'orange' => 'Oranje',
            'amber' => 'Amber',
            'green' => 'Groen',
            'teal' => 'Blauwgroen',
            'blue' => 'Blauw',
            'indigo' => 'Indigo',
            'purple' => 'Paars',
            'pink' => 'Roze',
            'gray' => 'Grijs',
        ],
    ],
    'actions' => [
        'save' => 'Wijzigingen opslaan',
        'create' => 'Aanmaken',
        'create_another' => 'Aanmaken & nog een aanmaken',
        'cancel' => 'Annuleren',
        'saved' => 'Opgeslagen',
        'created' => 'Aangemaakt',
    ],
    'builder' => [
        'add' => 'Toevoegen aan :label',
        'block_max_items' => ':block kan één keer worden gebruikt.|:block kan maximaal :count keer worden gebruikt.',
    ],
    'slider' => [
        'difference' => 'Het verschil tussen de waarden moet tussen :min en :max liggen.',
    ],
    'modal_table_select' => [
        'heading' => ':label selecteren',
        'select' => 'Selecteren',
    ],
    'translatable' => [
        'attribute' => ':attribute (:locale)',
        'editing_language' => 'Bewerkingstaal',
    ],
    'morph_to_select' => [
        'type' => 'Type',
    ],
    'icon_picker' => [
        'invalid' => 'Het geselecteerde pictogram is niet beschikbaar.',
    ],
];
