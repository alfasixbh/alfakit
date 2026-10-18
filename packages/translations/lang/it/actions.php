<?php

declare(strict_types=1);

return [
    'modal' => [
        'confirmation' => 'Vuoi davvero eseguire questa azione?',
        'confirm' => 'Conferma',
        'submit' => 'Invia',
        'cancel' => 'Annulla',
        'close' => 'Chiudi',
    ],
    'create' => [
        'label' => 'Crea :label',
        'modal' => [
            'heading' => 'Crea :label',
            'submit' => 'Crea',
        ],
        'notification' => 'Creato',
        'create_another' => 'Crea e creane un altro',
    ],
    'edit' => [
        'label' => 'Modifica',
        'modal' => [
            'heading' => 'Modifica :label',
            'submit' => 'Salva',
        ],
        'notification' => 'Salvato',
    ],
    'view' => [
        'label' => 'Visualizza',
        'modal' => [
            'heading' => 'Visualizza :label',
        ],
    ],
    'delete' => [
        'label' => 'Elimina',
        'modal' => [
            'heading' => 'Elimina :label',
            'submit' => 'Elimina',
        ],
        'notification' => 'Eliminato',
        'bulk' => [
            'heading' => 'Elimina i record selezionati',
            'notification' => 'Eliminati',
        ],
    ],
    'restore' => [
        'label' => 'Ripristina',
        'modal' => [
            'heading' => 'Ripristina :label',
            'submit' => 'Ripristina',
        ],
        'notification' => 'Ripristinato',
        'bulk' => [
            'heading' => 'Ripristina i record selezionati',
            'notification' => 'Ripristinati',
        ],
    ],
    'force_delete' => [
        'label' => 'Elimina definitivamente',
        'modal' => [
            'heading' => 'Elimina definitivamente :label',
            'description' => 'Questa azione non può essere annullata.',
            'submit' => 'Elimina',
        ],
        'notification' => 'Eliminato definitivamente',
        'bulk' => [
            'heading' => 'Elimina definitivamente i record selezionati',
            'notification' => 'Eliminati definitivamente',
        ],
    ],
    'replicate' => [
        'label' => 'Duplica',
        'modal' => [
            'heading' => 'Duplica :label',
            'submit' => 'Duplica',
        ],
        'notification' => 'Duplicato',
    ],
    'attach' => [
        'label' => 'Collega',
        'modal' => [
            'heading' => 'Collega :label',
            'submit' => 'Collega',
        ],
        'notification' => 'Collegato',
    ],
    'detach' => [
        'label' => 'Scollega',
        'modal' => [
            'heading' => 'Scollega :label',
            'submit' => 'Scollega',
        ],
        'notification' => 'Scollegato',
    ],
    'associate' => [
        'label' => 'Associa',
        'modal' => [
            'heading' => 'Associa :label',
            'submit' => 'Associa',
        ],
        'notification' => 'Associato',
    ],
    'dissociate' => [
        'label' => 'Dissocia',
        'modal' => [
            'heading' => 'Dissocia :label',
            'submit' => 'Dissocia',
        ],
        'notification' => 'Dissociato',
    ],
    'detach_bulk' => [
        'heading' => 'Scollega i record selezionati',
        'notification' => 'Scollegato',
    ],
    'dissociate_bulk' => [
        'heading' => 'Dissocia i record selezionati',
        'notification' => 'Dissociato',
    ],
    'rate_limited' => [
        'title' => 'Troppi tentativi',
        'body' => 'Attendi :seconds secondo prima di riprovare.|Attendi :seconds secondi prima di riprovare.',
    ],
    'password_confirmation' => [
        'incorrect' => 'La password non è corretta.',
        'throttled' => 'Troppi tentativi. Riprova tra :seconds secondi.',
    ],
    'bulk' => [
        'unauthorized_records' => ':count record selezionato è stato saltato perché non hai il permesso di modificarlo.|:count record selezionati sono stati saltati perché non hai il permesso di modificarli.',
        'all_failed' => 'Il record non è stato elaborato.|Nessuno dei :count record è stato elaborato.',
        'some_failed' => ':failure record su :total non è stato elaborato.|:failure record su :total non sono stati elaborati.',
    ],
    'history' => [
        'label' => 'Cronologia',
        'modal' => [
            'heading' => 'Cronologia di :label',
            'close' => 'Chiudi',
        ],
        'empty' => 'Ancora nessuna versione.',
        'events' => [
            'created' => 'Creato',
            'updated' => 'Aggiornato',
            'deleted' => 'Eliminato',
            'restored' => 'Ripristinato',
            'reverted' => 'Ripristinata una versione precedente',
        ],
        'restore' => [
            'label' => 'Ripristina questa versione',
            'modal' => [
                'heading' => 'Ripristinare questa versione?',
                'description' => 'I campi tracciati tornano ai valori di questa versione. I valori attuali restano nella cronologia.',
                'submit' => 'Ripristina',
            ],
            'notification' => 'Versione ripristinata',
        ],
    ],
    'undo' => [
        'done' => 'Fatto',
        'notification' => 'Annullato',
        'expired' => 'Non è più possibile annullare.',
        'conflict' => 'Il record è stato modificato nel frattempo, quindi non è possibile annullare.',
        'unavailable' => 'Non è più possibile annullare perché il record non esiste più.',
    ],
];
