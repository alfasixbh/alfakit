<?php

declare(strict_types=1);

return [
    'page' => [
        'title' => 'Backups',
        'navigation_label' => 'Backups',
    ],

    'table' => [
        'heading' => 'Backups',
        'columns' => [
            'name' => 'Backup',
            'disk' => 'Disco',
            'date' => 'Data',
            'size' => 'Tamanho',
        ],
        'filters' => [
            'disk' => 'Disco',
        ],
        'empty' => [
            'heading' => 'Nenhum backup ainda',
            'description' => 'Crie um backup para vê-lo aqui.',
        ],
    ],

    'destinations' => [
        'heading' => 'Destinos de backup',
        'label' => ':name em :disk',
        'healthy' => 'Íntegro',
        'unhealthy' => 'Com problemas',
        'unreachable' => 'Inacessível',
        'summary' => '{0} Nenhum backup · :size usados|{1} :count backup · :size usados · mais recente :newest|[2,*] :count backups · :size usados · mais recente :newest',
    ],

    'actions' => [
        'create' => [
            'label' => 'Criar backup',
            'modal_heading' => 'Criar um backup',
            'modal_description' => 'O backup é executado em segundo plano; ele aparecerá na lista quando terminar.',
            'submit' => 'Criar backup',
            'option' => 'Fazer backup de',
            'options' => [
                'all' => 'Banco de dados e arquivos',
                'only_db' => 'Somente banco de dados',
                'only_files' => 'Somente arquivos',
            ],
            'notification' => 'Criando um novo backup em segundo plano',
        ],
        'download' => [
            'label' => 'Baixar',
        ],
        'delete' => [
            'label' => 'Excluir',
            'modal_heading' => 'Excluir backup',
            'modal_description' => 'Excluir :name? Esta ação não pode ser desfeita.',
            'submit' => 'Excluir',
            'notification' => 'Backup excluído',
        ],
    ],
];
