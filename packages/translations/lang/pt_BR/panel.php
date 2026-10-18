<?php

declare(strict_types=1);

return [
    'dashboard' => [
        'title' => 'Painel',
        'customize' => [
            'span' => '{1} :count coluna|[2,*] :count colunas',
            'span_full' => 'Largura total',
            'invalid' => 'Este layout do painel não é válido.',
        ],
    ],
    'global_search' => [
        'placeholder' => 'Pesquisar…',
        'no_results' => 'Nenhum resultado encontrado.',
    ],
    'resources' => [
        'list' => 'Lista',
        'create' => [
            'title' => 'Criar :label',
            'breadcrumb' => 'Criar',
        ],
        'edit' => [
            'title' => 'Editar :label',
            'breadcrumb' => 'Editar',
        ],
        'view' => [
            'title' => 'Visualizar :label',
            'breadcrumb' => 'Visualizar',
        ],
        'api' => [
            'failed' => 'A solicitação falhou',
            'unreachable' => 'Não foi possível acessar a fonte de dados. Tente novamente.',
            'error' => 'A fonte de dados respondeu com um erro (:status). Tente novamente.',
            'invalid' => 'A fonte de dados recusou os dados.',
        ],
    ],
    'tenancy' => [
        'switch' => 'Trocar de equipe',
        'register' => 'Nova equipe',
        'profile' => 'Configurações da equipe',
    ],
    'errors' => [
        'default' => [
            'title' => 'Algo deu errado',
            'body' => 'Não foi possível concluir a solicitação. Tente novamente.',
        ],
        403 => [
            'title' => 'Acesso negado',
            'body' => 'Você não tem permissão para fazer isso.',
        ],
        404 => [
            'title' => 'Não encontrado',
            'body' => 'A página ou o registro que você procura não existe.',
        ],
    ],
    'command_palette' => [
        'placeholder' => 'Digite um comando ou pesquise…',
        'create' => 'Novo :label',
    ],
    'realtime' => [
        'conflict' => [
            'refused_title' => 'Não salvo: o registro foi alterado',
            'refused_body' => 'Outra pessoa salvou este registro depois que você o abriu. Revise as alterações e salve novamente ou mantenha as suas.',
            'yes' => 'Sim',
            'no' => 'Não',
        ],
    ],
    'themes' => [
        'neutral' => [
            'label' => 'Neutro',
            'description' => 'O clássico: conteúdo recuado ao lado de uma barra lateral, cabeçalhos simples e cartões com borda.',
        ],
        'alfakit' => [
            'label' => 'AlfaKit',
            'description' => 'O design característico da marca AlfaKit: Alfa Navy e Fox Orange sobre creme quente, títulos em Montserrat e texto em Inter, uma barra lateral flutuante com navegação em pílulas, um banner de destaque em cada página, cartões elevados, campos preenchidos e botões em pílula.',
        ],
        'minimal' => [
            'label' => 'Minimalista',
            'description' => 'Sem barra lateral: a navegação corre no topo como abas sublinhadas. Superfícies planas com linhas finas, campos sublinhados, botões quadrados, compacto.',
        ],
        'soft' => [
            'label' => 'Suave',
            'description' => 'Um trilho de ícones estreito, títulos grandes com serifa, cartões tingidos sem borda, campos preenchidos arredondados e tabelas listradas.',
        ],
        'corporate' => [
            'label' => 'Corporativo',
            'description' => 'Barra lateral azul-marinho com navegação por barra de destaque, uma faixa de título de largura total, superfícies quadradas com borda e tabelas listradas densas.',
        ],
        'filament' => [
            'label' => 'Estilo Filament',
            'description' => 'Tela cinza, barra lateral transparente, cartões brancos com contorno, detalhes em âmbar e Inter, como o FilamentPHP.',
        ],
    ],
    'pwa' => [
        'offline' => [
            'title' => 'Offline',
            'heading' => 'Você está offline',
            'body' => 'Verifique sua conexão. Esta página será recarregada automaticamente quando você voltar a ficar online.',
            'retry' => 'Tentar novamente',
        ],
    ],
];
