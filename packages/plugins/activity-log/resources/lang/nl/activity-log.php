<?php

declare(strict_types=1);

return [
    'resource' => [
        'label' => 'activiteit',
        'plural_label' => 'activiteiten',
        'navigation_label' => 'Activiteitenlog',
    ],

    'relation_manager' => [
        'title' => 'Activiteit',
    ],

    'fields' => [
        'log_name' => 'Log',
        'event' => 'Gebeurtenis',
        'description' => 'Beschrijving',
        'subject' => 'Onderwerp',
        'subject_type' => 'Type onderwerp',
        'causer' => 'Veroorzaker',
        'created_at' => 'Datum',
        'created_from' => 'Van',
        'created_until' => 'Tot',
        'changes' => 'Wijzigingen',
        'attribute' => 'Attribuut',
        'old' => 'Oude waarde',
        'new' => 'Nieuwe waarde',
        'property' => 'Eigenschap',
        'value' => 'Waarde',
    ],

    'sections' => [
        'overview' => 'Overzicht',
        'changes' => 'Wijzigingen',
        'properties' => 'Eigenschappen',
    ],

    'filters' => [
        'created_from_indicator' => 'Vanaf :date',
        'created_until_indicator' => 'Tot :date',
    ],

    'events' => [
        'created' => 'Aangemaakt',
        'updated' => 'Bijgewerkt',
        'deleted' => 'Verwijderd',
        'restored' => 'Hersteld',
    ],

    'causer' => [
        'system' => 'Systeem',
    ],

    'timeline' => [
        'label' => 'Activiteit',
        'empty' => 'Nog geen activiteit.',
        'entry' => ':event door :causer',
    ],

    'empty' => [
        'heading' => 'Nog geen activiteit',
        'description' => 'Wijzigingen in je records worden hier weergegeven.',
    ],
];
