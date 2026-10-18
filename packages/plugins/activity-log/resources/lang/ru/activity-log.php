<?php

declare(strict_types=1);

return [
    'resource' => [
        'label' => 'действие',
        'plural_label' => 'действия',
        'navigation_label' => 'Журнал действий',
    ],

    'relation_manager' => [
        'title' => 'Действия',
    ],

    'fields' => [
        'log_name' => 'Журнал',
        'event' => 'Событие',
        'description' => 'Описание',
        'subject' => 'Объект',
        'subject_type' => 'Тип объекта',
        'causer' => 'Инициатор',
        'created_at' => 'Дата',
        'created_from' => 'С',
        'created_until' => 'По',
        'changes' => 'Изменения',
        'attribute' => 'Атрибут',
        'old' => 'Старое значение',
        'new' => 'Новое значение',
        'property' => 'Свойство',
        'value' => 'Значение',
    ],

    'sections' => [
        'overview' => 'Обзор',
        'changes' => 'Изменения',
        'properties' => 'Свойства',
    ],

    'filters' => [
        'created_from_indicator' => 'С :date',
        'created_until_indicator' => 'По :date',
    ],

    'events' => [
        'created' => 'Создано',
        'updated' => 'Обновлено',
        'deleted' => 'Удалено',
        'restored' => 'Восстановлено',
    ],

    'causer' => [
        'system' => 'Система',
    ],

    'timeline' => [
        'label' => 'Действия',
        'empty' => 'Действий пока нет.',
        'entry' => ':event — :causer',
    ],

    'empty' => [
        'heading' => 'Действий пока нет',
        'description' => 'Здесь будут показаны изменения ваших записей.',
    ],
];
