<?php

declare(strict_types=1);

return [
    'resource' => [
        'label' => 'atividade',
        'plural_label' => 'atividades',
        'navigation_label' => 'Registro de atividades',
    ],

    'relation_manager' => [
        'title' => 'Atividade',
    ],

    'fields' => [
        'log_name' => 'Registro',
        'event' => 'Evento',
        'description' => 'Descrição',
        'subject' => 'Objeto',
        'subject_type' => 'Tipo de objeto',
        'causer' => 'Autor',
        'created_at' => 'Data',
        'created_from' => 'De',
        'created_until' => 'Até',
        'changes' => 'Alterações',
        'attribute' => 'Atributo',
        'old' => 'Valor antigo',
        'new' => 'Valor novo',
        'property' => 'Propriedade',
        'value' => 'Valor',
    ],

    'sections' => [
        'overview' => 'Visão geral',
        'changes' => 'Alterações',
        'properties' => 'Propriedades',
    ],

    'filters' => [
        'created_from_indicator' => 'A partir de :date',
        'created_until_indicator' => 'Até :date',
    ],

    'events' => [
        'created' => 'Criado',
        'updated' => 'Atualizado',
        'deleted' => 'Excluído',
        'restored' => 'Restaurado',
    ],

    'causer' => [
        'system' => 'Sistema',
    ],

    'timeline' => [
        'label' => 'Atividade',
        'empty' => 'Nenhuma atividade ainda.',
        'entry' => ':event por :causer',
    ],

    'empty' => [
        'heading' => 'Nenhuma atividade ainda',
        'description' => 'As alterações nos seus registros aparecerão aqui.',
    ],
];
