<?php

declare(strict_types=1);

return [
    'resource' => [
        'label' => 'activity',
        'plural_label' => 'activities',
        'navigation_label' => 'Activity log',
    ],

    'relation_manager' => [
        'title' => 'Activity',
    ],

    'fields' => [
        'log_name' => 'Log',
        'event' => 'Event',
        'description' => 'Description',
        'subject' => 'Subject',
        'subject_type' => 'Subject type',
        'causer' => 'Causer',
        'created_at' => 'Date',
        'created_from' => 'From',
        'created_until' => 'Until',
        'changes' => 'Changes',
        'attribute' => 'Attribute',
        'old' => 'Old value',
        'new' => 'New value',
        'property' => 'Property',
        'value' => 'Value',
    ],

    'sections' => [
        'overview' => 'Overview',
        'changes' => 'Changes',
        'properties' => 'Properties',
    ],

    'filters' => [
        'created_from_indicator' => 'From :date',
        'created_until_indicator' => 'Until :date',
    ],

    'events' => [
        'created' => 'Created',
        'updated' => 'Updated',
        'deleted' => 'Deleted',
        'restored' => 'Restored',
    ],

    'causer' => [
        'system' => 'System',
    ],

    'timeline' => [
        'label' => 'Activity',
        'empty' => 'No activity yet.',
        'entry' => ':event by :causer',
    ],

    'empty' => [
        'heading' => 'No activity yet',
        'description' => 'Changes to your records will be listed here.',
    ],
];
