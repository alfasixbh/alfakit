<?php

declare(strict_types=1);

/*
 * Italian storefront strings. Keys match lang/en/shop.php (tests/Feature/ShopTranslationParityTest.php).
 */
return [
    'attributes' => [
        'name' => 'nome',
        'rating' => 'valutazione',
        'review' => 'recensione',
    ],

    'locale' => [
        'label' => 'Lingua',
    ],

    'strip' => [
        'eyebrow' => 'Realizzato con AlfaKit',
        'title' => 'Una definizione di pannello, tre frontend.',
        'body' => 'Tutto ciò che vedi qui è renderizzato dallo stesso schema PHP. Cambia renderer e la pagina si ricarica in React, Vue o Svelte con lo stesso markup, lo stesso stile e lo stesso comportamento.',
        'cta' => 'Cambia renderer',
        'hint' => 'Stai visualizzando la build :renderer.',
        'mascot_alt' => 'La volpe, mascotte di AlfaKit',
    ],

    'newsletter' => [
        'heading' => 'Lettere dall’atelier',
        'body' => 'Un messaggio quando arriva una nuova fragranza, mai più di due volte al mese.',
        'label' => 'Indirizzo e-mail',
        'placeholder' => 'tu@example.com',
        'submit' => 'Iscriviti',
        'duplicate' => 'Questo indirizzo è già nell’elenco.',
        'thanks' => [
            'title' => 'Sei nell’elenco',
            'body' => 'La prossima lettera di Maison Alfa arriverà prima a te.',
        ],
    ],

    'product' => [
        'back' => 'Tutti i prodotti',
        'by' => 'di :brand',
        'sku' => 'Codice',
        'gallery' => 'Galleria',
        'image_of' => ':name, vista :index',
        'sizes' => 'Formati',
        'choose_size' => 'Scegli un formato',
        'stock' => [
            'in' => 'Disponibile',
            'low' => 'Solo :count rimasti',
            'out' => 'Esaurito',
        ],
        'notes' => [
            'heading' => 'Composizione',
            'top' => 'Note di testa',
            'heart' => 'Note di cuore',
            'base' => 'Note di fondo',
        ],
        'details' => [
            'heading' => 'Dettagli',
            'concentration' => 'Concentrazione',
            'audience' => 'Per',
            'size' => 'Formato',
            'category' => 'Categoria',
            'tags' => 'Tag',
        ],
        'enquire' => 'Chiedi informazioni su questa fragranza',
        'track' => 'Traccia un ordine',
        'reviews' => [
            'heading' => 'Recensioni',
            'count' => '{0} Ancora nessuna recensione|{1} Una recensione|[2,*] :count recensioni',
            'average' => ':average su 5',
            'empty' => 'Ancora nessuna recensione. Racconta per primo come si indossa.',
            'verified' => 'Acquisto verificato',
            'guest' => 'Ospite',
            'write' => 'Scrivi una recensione',
            'write_help' => 'Le recensioni vengono lette dal team e pubblicate dal pannello di amministrazione, di solito entro un giorno.',
        ],
        'related' => 'Potrebbe piacerti anche',
        'compare' => 'Prima :price',
        'currency_note' => 'Prezzi in dollari statunitensi, tasse incluse.',
    ],

    'review' => [
        'fields' => [
            'rating' => 'La tua valutazione',
            'name' => 'Il tuo nome',
            'email' => 'E-mail',
            'email_help' => 'Non viene mai mostrata. Se hai acquistato questa fragranza da noi, la tua recensione viene segnata come acquisto verificato.',
            'title' => 'Titolo',
            'body' => 'La tua recensione',
        ],
        'submit' => 'Invia recensione',
        'thanks' => [
            'title' => 'Grazie, :name',
            'body' => 'La tua recensione è stata inviata al team e comparirà una volta approvata nel pannello di amministrazione.',
        ],
    ],

    'contact' => [
        'heading' => 'Scrivi alla maison',
        'intro' => 'Una domanda su un ordine, una fragranza che non trovi, vendita all’ingrosso o stampa: il team di Manama legge ogni messaggio e risponde entro due giorni lavorativi.',
        'form_heading' => 'Invia un messaggio',
        'form_help' => 'Questo è un modulo autonomo di AlfaKit: la validazione avviene sul server, l’argomento mostra un campo per il numero d’ordine e il pulsante di invio ha un limite di frequenza.',
        'details' => [
            'heading' => 'La boutique',
            'email' => 'E-mail',
            'phone' => 'Telefono',
            'hours' => 'Orari di apertura',
            'hours_value' => 'Da sabato a giovedì, dalle 10:00 alle 22:00',
            'address' => 'Bahrain Bay, Manama',
        ],
        'fields' => [
            'name' => 'Il tuo nome',
            'email' => 'E-mail',
            'topic' => 'Argomento',
            'order_number' => 'Numero d’ordine',
            'message' => 'Messaggio',
            'message_help' => 'Almeno 20 caratteri. Indica la fragranza o l’ordine a cui ti riferisci.',
        ],
        'topics' => [
            'order' => 'Un ordine',
            'product' => 'Un prodotto',
            'wholesale' => 'Ingrosso',
            'press' => 'Stampa',
            'other' => 'Altro',
        ],
        'prefill' => 'Vorrei saperne di più su :product.',
        'submit' => 'Invia messaggio',
        'mail_subject' => 'Contatto Maison Alfa: :topic',
        'thanks' => [
            'title' => 'Grazie, :name',
            'body' => 'Risponderemo a :email entro due giorni lavorativi.',
        ],
        'rate_limited' => 'Hai già inviato diversi messaggi',
    ],

    'track' => [
        'heading' => 'Traccia un ordine',
        'intro' => 'Inserisci l’e-mail usata al pagamento e il numero d’ordine indicato nella conferma. Vedrai tutti gli ordini di quell’account e il percorso completo di quello richiesto.',
        'fields' => [
            'email' => 'E-mail usata al pagamento',
            'number' => 'Numero d’ordine',
            'submit' => 'Trova il mio ordine',
        ],
        'sample' => [
            'heading' => 'Prova con un ordine reale',
            'body' => 'Questo è un negozio demo, quindi ecco un ordine generato che puoi cercare:',
            'use' => 'Usa questo ordine',
        ],
        'not_found' => [
            'heading' => 'Non abbiamo trovato quell’ordine',
            'body' => 'Controlla l’e-mail e il numero d’ordine, oppure usa l’ordine di esempio qui sotto.',
        ],
        'orders' => [
            'heading' => 'I tuoi ordini',
            'description' => 'Tutti gli ordini effettuati da :name. Fai clic su un ordine per vederne la cronologia.',
            'number' => 'Ordine',
            'placed' => 'Effettuato',
            'items' => 'Articoli',
            'status' => 'Stato',
            'total' => 'Totale',
            'search' => 'Cerca per numero d’ordine',
        ],
        'timeline' => [
            'heading' => 'Ordine :number',
            'description' => 'Ogni passaggio, dal pagamento alla tua porta.',
            'steps' => 'Cronologia',
            'carrier' => 'Corriere',
            'tracking' => 'Numero di tracciamento',
            'ship_to' => 'Spedizione a',
            'no_shipment' => 'Non ancora spedito',
            'no_tracking' => 'Disponibile dopo la spedizione',
        ],
        'components_note' => 'La tabella degli ordini e la cronologia sono componenti autonomi di AlfaKit: una Table e una Infolist renderizzate nel layout del negozio.',
    ],
];
