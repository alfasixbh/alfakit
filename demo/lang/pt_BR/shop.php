<?php

declare(strict_types=1);

/*
 * Brazilian Portuguese storefront strings. Keys match lang/en/shop.php (tests/Feature/ShopTranslationParityTest.php).
 */
return [
    'attributes' => [
        'name' => 'nome',
        'rating' => 'avaliação',
        'review' => 'resenha',
    ],

    'locale' => [
        'label' => 'Idioma',
    ],

    'strip' => [
        'eyebrow' => 'Feito com AlfaKit',
        'title' => 'Uma definição de painel, três frontends.',
        'body' => 'Tudo o que você vê aqui é renderizado a partir do mesmo esquema PHP. Troque o renderizador e a página recarrega em React, Vue ou Svelte com a mesma marcação, o mesmo estilo e o mesmo comportamento.',
        'cta' => 'Trocar renderizador',
        'hint' => 'Você está vendo a versão :renderer.',
        'mascot_alt' => 'A raposa, mascote do AlfaKit',
    ],

    'newsletter' => [
        'heading' => 'Cartas do ateliê',
        'body' => 'Um aviso quando chega uma nova fragrância, nunca mais de duas vezes por mês.',
        'label' => 'Endereço de e-mail',
        'placeholder' => 'voce@example.com',
        'submit' => 'Inscrever-se',
        'duplicate' => 'Este endereço já está na lista.',
        'thanks' => [
            'title' => 'Você está na lista',
            'body' => 'A próxima carta da Maison Alfa chegará primeiro para você.',
        ],
    ],

    'product' => [
        'back' => 'Todos os produtos',
        'by' => 'por :brand',
        'sku' => 'Referência',
        'gallery' => 'Galeria',
        'image_of' => ':name, vista :index',
        'sizes' => 'Tamanhos',
        'choose_size' => 'Escolha um tamanho',
        'stock' => [
            'in' => 'Em estoque',
            'low' => 'Restam apenas :count',
            'out' => 'Esgotado',
        ],
        'notes' => [
            'heading' => 'Composição',
            'top' => 'Notas de saída',
            'heart' => 'Notas de corpo',
            'base' => 'Notas de fundo',
        ],
        'details' => [
            'heading' => 'Detalhes',
            'concentration' => 'Concentração',
            'audience' => 'Para',
            'size' => 'Tamanho',
            'category' => 'Categoria',
            'tags' => 'Tags',
        ],
        'enquire' => 'Perguntar sobre esta fragrância',
        'track' => 'Rastrear um pedido',
        'reviews' => [
            'heading' => 'Avaliações',
            'count' => '{0} Nenhuma avaliação ainda|{1} Uma avaliação|[2,*] :count avaliações',
            'average' => ':average de 5',
            'empty' => 'Nenhuma avaliação ainda. Seja o primeiro a contar como ela se comporta na pele.',
            'verified' => 'Compra verificada',
            'guest' => 'Visitante',
            'write' => 'Escrever uma avaliação',
            'write_help' => 'As avaliações são lidas pela equipe e publicadas pelo painel administrativo, geralmente em até um dia.',
        ],
        'related' => 'Você também pode gostar',
        'compare' => 'De :price',
        'currency_note' => 'Preços em dólares americanos, impostos incluídos.',
    ],

    'review' => [
        'fields' => [
            'rating' => 'Sua avaliação',
            'name' => 'Seu nome',
            'email' => 'E-mail',
            'email_help' => 'Nunca é exibido. Se você comprou esta fragrância conosco, sua avaliação é marcada como compra verificada.',
            'title' => 'Título',
            'body' => 'Sua resenha',
        ],
        'submit' => 'Enviar avaliação',
        'thanks' => [
            'title' => 'Obrigado, :name',
            'body' => 'Sua avaliação está com a equipe e aparecerá depois de aprovada no painel administrativo.',
        ],
    ],

    'contact' => [
        'heading' => 'Escreva para a maison',
        'intro' => 'Uma dúvida sobre um pedido, uma fragrância que você não encontra, atacado ou imprensa: a equipe em Manama lê todas as mensagens e responde em até dois dias úteis.',
        'form_heading' => 'Enviar uma mensagem',
        'form_help' => 'Este é um formulário independente do AlfaKit: a validação roda no servidor, o assunto revela um campo de número do pedido e o botão de envio tem limite de frequência.',
        'details' => [
            'heading' => 'A boutique',
            'email' => 'E-mail',
            'phone' => 'Telefone',
            'hours' => 'Horário de funcionamento',
            'hours_value' => 'De sábado a quinta, das 10h às 22h',
            'address' => 'Bahrain Bay, Manama',
        ],
        'fields' => [
            'name' => 'Seu nome',
            'email' => 'E-mail',
            'topic' => 'Assunto',
            'order_number' => 'Número do pedido',
            'message' => 'Mensagem',
            'message_help' => 'Pelo menos 20 caracteres. Informe a fragrância ou o pedido sobre o qual você está escrevendo.',
        ],
        'topics' => [
            'order' => 'Um pedido',
            'product' => 'Um produto',
            'wholesale' => 'Atacado',
            'press' => 'Imprensa',
            'other' => 'Outro assunto',
        ],
        'prefill' => 'Gostaria de saber mais sobre :product.',
        'submit' => 'Enviar mensagem',
        'mail_subject' => 'Contato Maison Alfa: :topic',
        'thanks' => [
            'title' => 'Obrigado, :name',
            'body' => 'Responderemos para :email em até dois dias úteis.',
        ],
        'rate_limited' => 'Você já enviou algumas mensagens',
    ],

    'track' => [
        'heading' => 'Rastrear um pedido',
        'intro' => 'Informe o e-mail usado na compra e o número do pedido da sua confirmação. Você verá todos os pedidos dessa conta e o trajeto completo do pedido solicitado.',
        'fields' => [
            'email' => 'E-mail usado na compra',
            'number' => 'Número do pedido',
            'submit' => 'Encontrar meu pedido',
        ],
        'sample' => [
            'heading' => 'Teste com um pedido real',
            'body' => 'Esta é uma loja de demonstração, então aqui está um pedido gerado que você pode consultar:',
            'use' => 'Usar este pedido',
        ],
        'not_found' => [
            'heading' => 'Não encontramos esse pedido',
            'body' => 'Confira o e-mail e o número do pedido, ou use o pedido de exemplo abaixo.',
        ],
        'orders' => [
            'heading' => 'Seus pedidos',
            'description' => 'Tudo o que :name pediu. Clique em um pedido para ver a linha do tempo.',
            'number' => 'Pedido',
            'placed' => 'Realizado',
            'items' => 'Itens',
            'status' => 'Status',
            'total' => 'Total',
            'search' => 'Pesquisar pelo número do pedido',
        ],
        'timeline' => [
            'heading' => 'Pedido :number',
            'description' => 'Cada etapa, da compra até a sua porta.',
            'steps' => 'Linha do tempo',
            'carrier' => 'Transportadora',
            'tracking' => 'Código de rastreio',
            'ship_to' => 'Entrega para',
            'no_shipment' => 'Ainda não enviado',
            'no_tracking' => 'Disponível após o envio',
        ],
        'components_note' => 'A tabela de pedidos e a linha do tempo são componentes independentes do AlfaKit: uma Table e uma Infolist renderizadas no layout da loja.',
    ],
];
