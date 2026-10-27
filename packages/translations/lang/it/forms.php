<?php

declare(strict_types=1);

return [
    'select' => [
        'boolean' => [
            'true' => 'Sì',
            'false' => 'No',
        ],
        'placeholder' => 'Seleziona un\'opzione',
        'search_prompt' => 'Inizia a digitare per cercare…',
        'no_search_results' => 'Nessuna opzione corrisponde alla ricerca.',
        'loading' => 'Caricamento…',
    ],
    'key_value' => [
        'key' => 'Chiave',
        'value' => 'Valore',
        'add' => 'Aggiungi riga',
        'delete' => 'Elimina riga',
        'reorder' => 'Riordina',
    ],
    'repeater' => [
        'cannot_add' => 'Non è possibile aggiungere elementi a :attribute.',
        'cannot_delete' => 'Non è possibile rimuovere elementi da :attribute.',
        'cannot_reorder' => 'Gli elementi di :attribute non possono essere riordinati.',
        'add' => 'Aggiungi a :label',
        'delete' => 'Elimina',
        'clone' => 'Duplica',
        'move_up' => 'Sposta su',
        'move_down' => 'Sposta giù',
        'collapse' => 'Comprimi',
        'expand' => 'Espandi',
        'reorder' => 'Riordina',
        'collapse_all' => 'Comprimi tutto',
        'expand_all' => 'Espandi tutto',
    ],
    'wizard' => [
        'next' => 'Avanti',
        'previous' => 'Indietro',
        'submit' => 'Invia',
    ],
    'file_upload' => [
        'drop' => 'Trascina e rilascia i file oppure',
        'browse' => 'sfoglia',
        'uploading' => 'Caricamento in corso…',
        'remove' => 'Rimuovi',
        'download' => 'Scarica',
        'too_large' => 'Questo file è troppo grande.',
        'invalid_type' => 'Questo tipo di file non è consentito.',
        'too_small' => 'Questo file è troppo piccolo.',
        'unavailable' => 'Questo caricamento non è più disponibile. Carica di nuovo il file.',
        'invalid_dimensions' => 'Le dimensioni dell’immagine non sono consentite.',
        'invalid_aspect_ratio' => 'Le proporzioni dell’immagine non sono consentite.',
        'chunk_failed' => 'Il caricamento è incompleto. Carica di nuovo il file.',
        'types' => [
            'images' => 'Immagini',
            'videos' => 'Video',
            'audio' => 'File audio',
            'text' => 'File di testo',
        ],
    ],
    'tags_input' => [
        'placeholder' => 'Aggiungi un tag…',
    ],
    'rich_editor' => [
        'link_prompt' => 'Inserisci un URL',
        'insert_block' => 'Inserisci :block',
        'edit_block' => 'Modifica :block',
        'save_block' => 'Salva',
        'insert' => 'Inserisci',
        'text_colors' => [
            'red' => 'Rosso',
            'orange' => 'Arancione',
            'amber' => 'Ambra',
            'green' => 'Verde',
            'teal' => 'Verde acqua',
            'blue' => 'Blu',
            'indigo' => 'Indaco',
            'purple' => 'Viola',
            'pink' => 'Rosa',
            'gray' => 'Grigio',
        ],
    ],
    'actions' => [
        'save' => 'Salva modifiche',
        'create' => 'Crea',
        'create_another' => 'Crea e creane un altro',
        'cancel' => 'Annulla',
        'saved' => 'Salvato',
        'created' => 'Creato',
    ],
    'builder' => [
        'add' => 'Aggiungi a :label',
        'block_max_items' => ':block può essere usato una sola volta.|:block può essere usato fino a :count volte.',
    ],
    'slider' => [
        'difference' => 'La differenza tra i valori deve essere compresa tra :min e :max.',
    ],
    'modal_table_select' => [
        'heading' => 'Seleziona :label',
        'select' => 'Seleziona',
    ],
    'translatable' => [
        'attribute' => ':attribute (:locale)',
        'editing_language' => 'Lingua di modifica',
    ],
    'morph_to_select' => [
        'type' => 'Tipo',
    ],
    'icon_picker' => [
        'invalid' => 'L\'icona selezionata non è disponibile.',
    ],
];
