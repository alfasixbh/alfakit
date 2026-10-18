<?php

declare(strict_types=1);

return [
    'resource' => [
        'label' => 'activité',
        'plural_label' => 'activités',
        'navigation_label' => 'Journal d’activité',
    ],

    'relation_manager' => [
        'title' => 'Activité',
    ],

    'fields' => [
        'log_name' => 'Journal',
        'event' => 'Événement',
        'description' => 'Description',
        'subject' => 'Objet',
        'subject_type' => 'Type d’objet',
        'causer' => 'Auteur',
        'created_at' => 'Date',
        'created_from' => 'Du',
        'created_until' => 'Au',
        'changes' => 'Modifications',
        'attribute' => 'Attribut',
        'old' => 'Ancienne valeur',
        'new' => 'Nouvelle valeur',
        'property' => 'Propriété',
        'value' => 'Valeur',
    ],

    'sections' => [
        'overview' => 'Aperçu',
        'changes' => 'Modifications',
        'properties' => 'Propriétés',
    ],

    'filters' => [
        'created_from_indicator' => 'Depuis le :date',
        'created_until_indicator' => 'Jusqu’au :date',
    ],

    'events' => [
        'created' => 'Créé',
        'updated' => 'Mis à jour',
        'deleted' => 'Supprimé',
        'restored' => 'Restauré',
    ],

    'causer' => [
        'system' => 'Système',
    ],

    'timeline' => [
        'label' => 'Activité',
        'empty' => 'Aucune activité pour le moment.',
        'entry' => ':event par :causer',
    ],

    'empty' => [
        'heading' => 'Aucune activité pour le moment',
        'description' => 'Les modifications de vos enregistrements apparaîtront ici.',
    ],
];
