<?php

declare(strict_types=1);

return [

    'notifications' => [
        'saved' => 'Ordem salva',
    ],

    // Node buttons: they name the node, like the move buttons.
    'actions' => [
        'view' => 'Ver :title',
        'edit' => 'Editar :title',
        'delete' => 'Excluir :title',
    ],

    'validation' => [
        'invalid' => 'Não foi possível ler a árvore.',
        'unknown_record' => 'Um registro da árvore não existe mais. Recarregue a página e tente novamente.',
        'duplicate_record' => 'Um registro aparece mais de uma vez na árvore.',
        'unknown_parent' => 'Um registro pai não existe mais. Recarregue a página e tente novamente.',
        'cycle' => 'Um registro não pode ser movido para dentro de si mesmo.',
        'max_depth' => 'A árvore pode ter no máximo :depth níveis de profundidade.',
    ],

    // Shared with the renderers as `tree.*` (see TreePlugin::register()).
    'ui' => [
        'label' => 'Árvore',
        'expand_all' => 'Expandir tudo',
        'collapse_all' => 'Recolher tudo',
        'expand' => 'Expandir :title',
        'collapse' => 'Recolher :title',
        'move_up' => 'Mover :title para cima',
        'move_down' => 'Mover :title para baixo',
        'indent' => 'Mover :title para dentro do item acima',
        'outdent' => 'Tirar :title do item pai',
        'save' => 'Salvar ordem',
        'saving' => 'Salvando…',
        'discard' => 'Descartar alterações',
        'unsaved' => 'Você tem alterações não salvas na ordem.',
        'save_failed' => 'Não foi possível salvar a ordem.',
        'empty' => 'Nenhum registro ainda',
        'moved' => ':title movido para a posição :position de :count, nível :level.',
    ],

];
