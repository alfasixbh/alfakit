<?php

declare(strict_types=1);

/*
 * Brazilian Portuguese demo strings. Keys must match lang/en/demo.php (tests/Feature/TranslationParityTest.php).
 */
return [
    'brand' => 'Maison Alfa',
    'tagline' => 'Perfumaria e estilo de vida, com curadoria no Bahrein.',

    'navigation' => [
        'catalog' => 'Catálogo',
        'sales' => 'Vendas',
        'customers' => 'Clientes',
        'marketing' => 'Marketing',
        'reports' => 'Relatórios',
        'settings' => 'Configurações',
        'showcase' => 'Vitrine',
        'support' => 'Suporte',
        'content' => 'Conteúdo',
        'system' => 'Sistema',
    ],

    'switcher' => [
        'label' => 'Renderizador',
        'react' => 'React',
        'vue' => 'Vue',
        'svelte' => 'Svelte',
        'current' => ':renderer (atual)',
    ],

    'design' => [
        'theme' => 'Tema',
        'mobile_preset' => 'Predefinição móvel',
        'mobile_on' => 'Navegação inferior em celulares',
        'mobile_off' => 'Menu lateral em celulares',
    ],

    'footer' => [
        'note' => 'Demo do AlfaKit · redefinida a cada hora',
        'docs' => 'Documentação',
    ],

    'meta' => [
        'site' => 'Demo do AlfaKit',
        'title' => 'Maison Alfa · a demo do AlfaKit',
        'panel_title' => 'Administração da Maison Alfa · a demo do AlfaKit',
        'description' => 'Uma perfumaria fictícia criada com o AlfaKit: uma única definição de painel administrativo Laravel, renderizada com React, Vue e Svelte. Entre com a conta de demonstração compartilhada; tudo é redefinido a cada hora.',
    ],

    'reset' => [
        'in' => 'Redefinição em :minutes min',
        'soon' => 'Redefinição em menos de um minuto',
        'title' => 'O banco de dados e os uploads da demo são restaurados a cada hora cheia.',
    ],

    'profile' => [
        'locked_heading' => 'Esta é a conta de demonstração compartilhada',
        'locked_body' => 'O e-mail e a senha permanecem iguais para que o próximo visitante possa entrar. Você ainda pode alterar o nome de exibição.',
        'mfa_heading' => 'Autenticação de dois fatores',
        'mfa_body' => 'A configuração está desativada para a conta compartilhada. Personifique um colega em Configurações › Equipe para testar o app autenticador e os códigos por e-mail.',
    ],

    'errors' => [
        'back_home' => 'Voltar para a loja',
        'open_admin' => 'Abrir o painel administrativo',
        '403' => ['title' => 'Não disponível para esta conta', 'body' => 'Sua função nesta loja não inclui esta página. Troque de loja ou peça acesso a um proprietário.'],
        '404' => ['title' => 'Página não encontrada', 'body' => 'A página pode ter sido movida, ou o registro foi removido pela redefinição a cada hora.'],
        '419' => ['title' => 'Página expirada', 'body' => 'Sua sessão expirou. Recarregue a página e tente novamente.'],
        '429' => ['title' => 'Vá com calma', 'body' => 'Muitas solicitações em pouco tempo. Aguarde um momento e tente novamente.'],
        '500' => ['title' => 'Algo deu errado', 'body' => 'O erro foi registrado. Tente novamente em instantes.'],
        '503' => ['title' => 'Voltamos já', 'body' => 'A demo está sendo atualizada. Ela volta em um minuto.'],
    ],

    'login' => [
        'about' => 'A Maison Alfa é uma perfumaria fictícia cujo painel administrativo é criado com o AlfaKit e renderizado por React, Vue ou Svelte.',
        'heading' => 'Conta de demonstração',
        'hint' => 'Entre com :email e a senha :password. Tudo o que você alterar é redefinido a cada hora.',
        'fill' => 'Usar a conta de demonstração',
    ],

    'storefront' => [
        'title' => 'Maison Alfa',
        'nav' => [
            'home' => 'Início',
            'contact' => 'Contato',
            'track' => 'Rastrear um pedido',
            'admin' => 'Abrir o painel administrativo',
        ],
        'hero' => [
            'eyebrow' => 'A loja de demonstração do AlfaKit',
            'title' => 'Fragrâncias com história, software com personalidade.',
            'body' => 'A Maison Alfa é uma casa de perfumes fictícia que existe para mostrar o que o AlfaKit renderiza: uma aplicação Laravel, uma definição de painel administrativo, três frontends. Navegue pela loja e depois abra o mesmo painel em React, Vue ou Svelte.',
            'cta' => 'Abrir o painel administrativo',
            'secondary' => 'Ler a documentação',
        ],
        'featured' => 'Destaques da estação',
        'from' => 'A partir de :price',
        'notes' => 'Saída :top · Corpo :heart · Fundo :base',
        'by' => 'por :brand',
        'empty' => 'Ainda não há produtos em destaque. Execute php artisan demo:reset para popular a loja.',
        'footer' => [
            'beta' => 'Beta pública do AlfaKit',
            'built' => 'Feito com AlfaKit pela Alfa Six. Loja fictícia, software real.',
            'renderer' => 'Renderizado com :renderer',
        ],
    ],

    'product_status' => [
        'draft' => 'Rascunho',
        'active' => 'Ativo',
        'archived' => 'Arquivado',
    ],
    'order_status' => [
        'pending' => 'Pendente',
        'paid' => 'Pago',
        'processing' => 'Em preparação',
        'shipped' => 'Enviado',
        'delivered' => 'Entregue',
        'cancelled' => 'Cancelado',
        'refunded' => 'Reembolsado',
    ],
    'payment_method' => [
        'card' => 'Cartão',
        'apple_pay' => 'Apple Pay',
        'paypal' => 'PayPal',
        'bank_transfer' => 'Transferência bancária',
        'cash_on_delivery' => 'Pagamento na entrega',
    ],
    'payment_status' => [
        'pending' => 'Pendente',
        'captured' => 'Capturado',
        'failed' => 'Falhou',
        'refunded' => 'Reembolsado',
    ],
    'shipment_status' => [
        'pending' => 'Pendente',
        'in_transit' => 'Em trânsito',
        'delivered' => 'Entregue',
        'returned' => 'Devolvido',
    ],
    'review_status' => [
        'pending' => 'Pendente',
        'approved' => 'Aprovada',
        'rejected' => 'Rejeitada',
    ],
    'discount_type' => [
        'percentage' => 'Porcentagem',
        'fixed' => 'Valor fixo',
        'free_shipping' => 'Frete grátis',
    ],
    'staff_role' => [
        'owner' => 'Proprietário',
        'manager' => 'Gerente',
        'staff' => 'Equipe',
    ],
    'concentration' => [
        'extrait' => 'Extrait de parfum',
        'parfum' => 'Parfum',
        'eau_de_parfum' => 'Eau de parfum',
        'eau_de_toilette' => 'Eau de toilette',
        'body_mist' => 'Body splash',
        'candle' => 'Vela aromática',
        'diffuser' => 'Difusor de varetas',
    ],
    'audience' => [
        'unisex' => 'Unissex',
        'women' => 'Feminino',
        'men' => 'Masculino',
    ],

    'timeline' => [
        'placed' => 'Pedido realizado',
        'paid' => 'Pagamento capturado',
        'processing' => 'Separado e embalado',
        'shipped' => 'Entregue à :carrier',
        'delivered' => 'Entregue',
        'cancelled' => 'Cancelado pelo cliente',
        'refunded' => 'Reembolso emitido',
    ],
];
