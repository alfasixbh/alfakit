<?php

declare(strict_types=1);

return [
    'dashboard' => [
        'title' => 'Dashboard',
        'customize' => [
            'span' => '{1} :count colonna|[2,*] :count colonne',
            'span_full' => 'Larghezza piena',
            'invalid' => 'Questo layout della dashboard non è valido.',
        ],
    ],
    'global_search' => [
        'placeholder' => 'Cerca…',
        'no_results' => 'Nessun risultato trovato.',
    ],
    'resources' => [
        'list' => 'Elenco',
        'create' => [
            'title' => 'Crea :label',
            'breadcrumb' => 'Crea',
        ],
        'edit' => [
            'title' => 'Modifica :label',
            'breadcrumb' => 'Modifica',
        ],
        'view' => [
            'title' => 'Visualizza :label',
            'breadcrumb' => 'Visualizza',
        ],
        'api' => [
            'failed' => 'La richiesta non è riuscita',
            'unreachable' => 'Impossibile raggiungere l\'origine dati. Riprova.',
            'error' => 'L\'origine dati ha risposto con un errore (:status). Riprova.',
            'invalid' => 'L\'origine dati ha rifiutato i dati.',
        ],
    ],
    'tenancy' => [
        'switch' => 'Cambia team',
        'register' => 'Nuovo team',
        'profile' => 'Impostazioni del team',
    ],
    'errors' => [
        'default' => [
            'title' => 'Qualcosa è andato storto',
            'body' => 'Impossibile completare la richiesta. Riprova.',
        ],
        403 => [
            'title' => 'Accesso negato',
            'body' => 'Non hai i permessi per farlo.',
        ],
        404 => [
            'title' => 'Non trovato',
            'body' => 'La pagina o il record che cerchi non esiste.',
        ],
    ],
    'command_palette' => [
        'placeholder' => 'Digita un comando o cerca…',
        'create' => 'Nuovo :label',
    ],
    'realtime' => [
        'conflict' => [
            'refused_title' => 'Non salvato: il record è stato modificato',
            'refused_body' => 'Qualcun altro ha salvato questo record dopo che lo hai aperto. Rivedi le sue modifiche, poi salva di nuovo o mantieni le tue.',
            'yes' => 'Sì',
            'no' => 'No',
        ],
    ],
    'themes' => [
        'neutral' => [
            'label' => 'Neutro',
            'description' => 'Il classico: contenuto rientrato accanto a una barra laterale, intestazioni semplici e schede con bordo.',
        ],
        'alfakit' => [
            'label' => 'AlfaKit',
            'description' => 'Il design distintivo del marchio AlfaKit: Alfa Navy e Fox Orange su crema calda, titoli in Montserrat e testo in Inter, una barra laterale flottante con navigazione a pillole, un banner in ogni pagina, schede in rilievo, campi pieni e pulsanti a pillola.',
        ],
        'minimal' => [
            'label' => 'Minimale',
            'description' => 'Nessuna barra laterale: la navigazione scorre in alto come schede sottolineate. Superfici piatte a filo sottile, campi sottolineati, pulsanti quadrati, compatto.',
        ],
        'soft' => [
            'label' => 'Morbido',
            'description' => 'Una sottile barra di icone, grandi titoli con grazie, schede colorate senza bordo, campi pieni arrotondati e tabelle a righe.',
        ],
        'corporate' => [
            'label' => 'Aziendale',
            'description' => 'Barra laterale blu navy con navigazione a barra d’accento, una fascia del titolo a tutta larghezza, superfici quadrate con bordo e tabelle a righe dense.',
        ],
        'filament' => [
            'label' => 'Stile Filament',
            'description' => 'Sfondo grigio, barra laterale trasparente, schede bianche con contorno, accenti ambra e Inter, come FilamentPHP.',
        ],
    ],
    'pwa' => [
        'offline' => [
            'title' => 'Offline',
            'heading' => 'Sei offline',
            'body' => 'Controlla la connessione. La pagina si ricaricherà da sola quando tornerai online.',
            'retry' => 'Riprova',
        ],
    ],
];
