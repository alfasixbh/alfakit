<?php

declare(strict_types=1);

return [
    'dashboard' => [
        'title' => 'Dashboard',
        'customize' => [
            'span' => '{1} :count kolom|[2,*] :count kolommen',
            'span_full' => 'Volledige breedte',
            'invalid' => 'Deze dashboardindeling is ongeldig.',
        ],
    ],
    'global_search' => [
        'placeholder' => 'Zoeken…',
        'no_results' => 'Geen resultaten gevonden.',
    ],
    'resources' => [
        'list' => 'Overzicht',
        'create' => [
            'title' => ':label aanmaken',
            'breadcrumb' => 'Aanmaken',
        ],
        'edit' => [
            'title' => ':label bewerken',
            'breadcrumb' => 'Bewerken',
        ],
        'view' => [
            'title' => ':label bekijken',
            'breadcrumb' => 'Bekijken',
        ],
        'api' => [
            'failed' => 'Het verzoek is mislukt',
            'unreachable' => 'De gegevensbron is niet bereikbaar. Probeer het opnieuw.',
            'error' => 'De gegevensbron antwoordde met een fout (:status). Probeer het opnieuw.',
            'invalid' => 'De gegevensbron heeft de gegevens geweigerd.',
        ],
    ],
    'tenancy' => [
        'switch' => 'Team wisselen',
        'register' => 'Nieuw team',
        'profile' => 'Teaminstellingen',
    ],
    'errors' => [
        'default' => [
            'title' => 'Er is iets misgegaan',
            'body' => 'Het verzoek kon niet worden voltooid. Probeer het opnieuw.',
        ],
        403 => [
            'title' => 'Toegang geweigerd',
            'body' => 'Je hebt geen toestemming om dit te doen.',
        ],
        404 => [
            'title' => 'Niet gevonden',
            'body' => 'De pagina of het record dat je zoekt bestaat niet.',
        ],
    ],
    'command_palette' => [
        'placeholder' => 'Typ een opdracht of zoek…',
        'create' => 'Nieuw :label',
    ],
    'realtime' => [
        'conflict' => [
            'refused_title' => 'Niet opgeslagen: het record is gewijzigd',
            'refused_body' => 'Iemand anders heeft dit record opgeslagen nadat je het opende. Bekijk de wijzigingen en sla opnieuw op of houd die van jou.',
            'yes' => 'Ja',
            'no' => 'Nee',
        ],
    ],
    'themes' => [
        'neutral' => [
            'label' => 'Neutraal',
            'description' => 'De klassieker: ingesprongen inhoud naast een zijbalk, eenvoudige kopteksten en omrande kaarten.',
        ],
        'alfakit' => [
            'label' => 'AlfaKit',
            'description' => 'Het kenmerkende ontwerp in de AlfaKit-huisstijl: Alfa Navy en Fox Orange op warm crème, titels in Montserrat en tekst in Inter, een zwevende zijbalk met pilnavigatie, een herobanner op elke pagina, verhoogde kaarten, gevulde invoervelden en pilknoppen.',
        ],
        'minimal' => [
            'label' => 'Minimaal',
            'description' => 'Geen zijbalk: de navigatie loopt bovenaan als onderstreepte tabbladen. Vlakke oppervlakken met haarlijnen, onderstreepte invoervelden, vierkante knoppen, compact.',
        ],
        'soft' => [
            'label' => 'Zacht',
            'description' => 'Een smalle pictogrammenbalk, grote schreeftitels, getinte randloze kaarten, gevulde afgeronde invoervelden en gestreepte tabellen.',
        ],
        'corporate' => [
            'label' => 'Zakelijk',
            'description' => 'Marineblauwe zijbalk met accentbalknavigatie, een titelband over de volle breedte, vierkante omrande oppervlakken en compacte gestreepte tabellen.',
        ],
        'filament' => [
            'label' => 'Filament-stijl',
            'description' => 'Grijs canvas, transparante zijbalk, witte omrande kaarten, amberkleurige accenten en Inter, zoals FilamentPHP.',
        ],
    ],
    'pwa' => [
        'offline' => [
            'title' => 'Offline',
            'heading' => 'Je bent offline',
            'body' => 'Controleer je verbinding. Deze pagina laadt vanzelf opnieuw zodra je weer online bent.',
            'retry' => 'Opnieuw proberen',
        ],
    ],
];
