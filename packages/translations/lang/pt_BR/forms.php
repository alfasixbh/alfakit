<?php

declare(strict_types=1);

return [
    'select' => [
        'boolean' => [
            'true' => 'Sim',
            'false' => 'Não',
        ],
        'placeholder' => 'Selecione uma opção',
        'search_prompt' => 'Comece a digitar para pesquisar…',
        'no_search_results' => 'Nenhuma opção corresponde à sua pesquisa.',
        'loading' => 'Carregando…',
    ],
    'key_value' => [
        'key' => 'Chave',
        'value' => 'Valor',
        'add' => 'Adicionar linha',
        'delete' => 'Excluir linha',
        'reorder' => 'Reordenar',
    ],
    'repeater' => [
        'cannot_add' => 'Não é possível adicionar itens a :attribute.',
        'cannot_delete' => 'Não é possível remover itens de :attribute.',
        'cannot_reorder' => 'Os itens de :attribute não podem ser reordenados.',
        'add' => 'Adicionar a :label',
        'delete' => 'Excluir',
        'clone' => 'Duplicar',
        'move_up' => 'Mover para cima',
        'move_down' => 'Mover para baixo',
        'collapse' => 'Recolher',
        'expand' => 'Expandir',
        'reorder' => 'Reordenar',
        'collapse_all' => 'Recolher tudo',
        'expand_all' => 'Expandir tudo',
    ],
    'wizard' => [
        'next' => 'Próximo',
        'previous' => 'Voltar',
        'submit' => 'Enviar',
    ],
    'file_upload' => [
        'drop' => 'Arraste e solte arquivos ou',
        'browse' => 'procure',
        'uploading' => 'Enviando…',
        'remove' => 'Remover',
        'download' => 'Baixar',
        'too_large' => 'Este arquivo é muito grande.',
        'invalid_type' => 'Este tipo de arquivo não é permitido.',
        'too_small' => 'Este arquivo é muito pequeno.',
        'unavailable' => 'Este envio não está mais disponível. Envie o arquivo novamente.',
        'invalid_dimensions' => 'As dimensões da imagem não são permitidas.',
        'invalid_aspect_ratio' => 'A proporção da imagem não é permitida.',
        'chunk_failed' => 'O envio está incompleto. Envie o arquivo novamente.',
        'types' => [
            'images' => 'Imagens',
            'videos' => 'Vídeos',
            'audio' => 'Áudio',
            'text' => 'Arquivos de texto',
        ],
    ],
    'tags_input' => [
        'placeholder' => 'Adicionar uma tag…',
    ],
    'rich_editor' => [
        'link_prompt' => 'Informe uma URL',
        'insert_block' => 'Inserir :block',
        'edit_block' => 'Editar :block',
        'save_block' => 'Salvar',
        'insert' => 'Inserir',
        'text_colors' => [
            'red' => 'Vermelho',
            'orange' => 'Laranja',
            'amber' => 'Âmbar',
            'green' => 'Verde',
            'teal' => 'Verde-azulado',
            'blue' => 'Azul',
            'indigo' => 'Índigo',
            'purple' => 'Roxo',
            'pink' => 'Rosa',
            'gray' => 'Cinza',
        ],
    ],
    'actions' => [
        'save' => 'Salvar alterações',
        'create' => 'Criar',
        'create_another' => 'Criar e criar outro',
        'cancel' => 'Cancelar',
        'saved' => 'Salvo',
        'created' => 'Criado',
    ],
    'builder' => [
        'add' => 'Adicionar a :label',
        'block_max_items' => ':block pode ser usado uma vez.|:block pode ser usado até :count vezes.',
    ],
    'slider' => [
        'difference' => 'A diferença entre os valores deve estar entre :min e :max.',
    ],
    'modal_table_select' => [
        'heading' => 'Selecionar :label',
        'select' => 'Selecionar',
    ],
    'translatable' => [
        'attribute' => ':attribute (:locale)',
        'editing_language' => 'Idioma de edição',
    ],
    'morph_to_select' => [
        'type' => 'Tipo',
    ],
    'icon_picker' => [
        'invalid' => 'O ícone selecionado não está disponível.',
    ],
];
