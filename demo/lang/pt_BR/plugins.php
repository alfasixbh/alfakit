<?php

declare(strict_types=1);

/*
 * Brazilian Portuguese strings of the first-party plugin integration. Keys match lang/en/plugins.php.
 */
return [
    'commands' => [
        'group' => 'Maison Alfa',
        'order_board' => 'Abrir o quadro de pedidos',
        'calendar' => 'Abrir o calendário da loja',
        'returns' => 'Revisar devoluções',
        'category_tree' => 'Organizar a árvore de categorias',
        'new_product' => 'Adicionar um produto',
        'storefront' => 'Abrir a loja virtual',
    ],

    'board' => [
        'title' => 'Quadro de pedidos',
        'subheading' => 'Arraste os pedidos pelo fluxo de expedição ou mova-os com o teclado (Espaço, setas, Espaço). Os últimos 60 dias.',
        'open' => 'Quadro',
        'timeline_note' => 'Movido no quadro de pedidos por :user',
    ],

    'calendar' => [
        'title' => 'Calendário',
        'subheading' => 'Promoções, envios, entregas e páginas agendadas desta loja.',
        'this_week' => 'Esta semana',
        'new_promotion' => 'Planejar uma promoção',
        'hint' => 'Arraste uma promoção para movê-la, arraste o fim para mudar a duração, clique para editar ou selecione dias para planejar uma nova.',
        'fields' => [
            'value' => 'Valor (% ou quantia)',
        ],
        'legend' => [
            'label' => 'Legenda',
            'percentage' => 'Promoção: desconto percentual',
            'fixed' => 'Promoção: desconto em valor',
            'free_shipping' => 'Promoção: frete grátis',
            'shipped' => 'O envio saiu da boutique',
            'delivered' => 'Entregue',
            'publish' => 'Página agendada',
        ],
        'events' => [
            'shipped' => ':number enviado (:carrier)',
            'delivered' => ':number entregue',
            'publish' => 'Publicar: :title',
        ],
    ],

    'returns' => [
        'label' => 'devolução',
        'plural' => 'Devoluções',
        'workflow' => 'Aprovação de devoluções',
        'subheading' => 'O suporte abre uma devolução a partir de um pedido e a envia; um proprietário ou gerente a aprova em Aprovações; devoluções aprovadas são reembolsadas.',
        'empty' => 'Nenhuma devolução ainda',
        'request' => 'Solicitar devolução',
        'request_heading' => 'Devolução do pedido :number',
        'created' => 'Devolução :number aberta. Envie para aprovação quando estiver completa.',
        'timeline_note' => 'Reembolsado pela devolução :number',
        'states' => [
            'requested' => 'Solicitada',
            'awaiting_approval' => 'Aguardando aprovação',
            'approved' => 'Aprovada',
            'rejected' => 'Rejeitada',
            'refunded' => 'Reembolsada',
            'closed' => 'Encerrada',
        ],
        'transitions' => [
            'submit' => 'Enviar para aprovação',
            'refund' => 'Reembolsar',
            'reopen' => 'Reabrir',
            'close' => 'Encerrar',
        ],
        'steps' => [
            'manager' => 'Aprovação do gerente',
        ],
        'reasons' => [
            'damaged' => 'Danificado no transporte',
            'wrong_item' => 'Item errado',
            'not_as_described' => 'Diferente do anunciado',
            'allergy' => 'Reação na pele',
            'changed_mind' => 'Desistência',
        ],
        'fields' => [
            'number' => 'Devolução',
            'state' => 'Situação',
            'reason' => 'Motivo',
            'amount' => 'Valor do reembolso',
            'details' => 'Detalhes',
            'requested_by' => 'Aberta por',
            'refund_reference' => 'Referência do reembolso',
        ],
        'sections' => [
            'workflow' => 'Fluxo de trabalho',
            'history' => 'Histórico',
            'details' => 'Devolução',
        ],
    ],

    'invoices' => [
        'issue' => 'Emitir fatura',
        'open' => 'Abrir fatura',
        'issue_description' => 'Cria uma fatura a partir dos itens do pedido, com impostos conforme as alíquotas da loja.',
        'notes' => 'Fatura do pedido :number. Obrigado por comprar na Maison Alfa.',
        'terms' => 'Pagamento em até 14 dias. Documento de exemplo da demo do AlfaKit.',
    ],

    'comments' => [
        'section' => 'Comentários internos',
        'section_description' => 'Visíveis apenas para a equipe. Digite @ para mencionar um colega; ele é avisado no sino.',
    ],

    'activity' => [
        'section' => 'Trilha de auditoria',
    ],

    'helpdesk' => [
        'greeting' => 'Olá! Pergunte o que quiser sobre nossas fragrâncias ou seu pedido.',
    ],

    'tree' => [
        'title' => 'Árvore de categorias',
        'subheading' => 'Arraste as categorias para aninhá-las ou reordená-las (ou use os botões de seta) e salve. As categorias são compartilhadas por todas as lojas.',
        'open' => 'Visualização em árvore',
    ],

    'tags' => [
        'segments' => 'Segmentos',
    ],

    'media' => [
        'gallery' => 'Galeria de lifestyle',
        'gallery_description' => 'Imagens extras guardadas na biblioteca de mídia (separadas das imagens do produto acima).',
    ],

    'views' => [
        'low_stock' => 'Estoque baixo',
        'featured' => 'Destaques',
        'drafts' => 'Rascunhos',
    ],

    'ai' => [
        'summarise_reviews' => 'Resumir avaliações',
        'summarise_heading' => 'O que os clientes dizem sobre :name',
        'summarise_prompt' => 'Resuma estas avaliações de clientes do perfume ":name" em três tópicos curtos: o que adoram, o que criticam e para quem ele é indicado.',
    ],

    'settings' => [
        'title' => 'Configurações da maison',
        'subheading' => 'Compartilhadas por todas as lojas da Maison Alfa. A loja virtual exibe o aviso.',
        'sections' => [
            'brand' => 'Maison e loja virtual',
            'notifications' => 'Notificações',
        ],
        'fields' => [
            'house_name' => 'Nome da maison',
            'announcement' => 'Aviso da loja virtual',
            'announcement_help' => 'Exibido no topo de todas as páginas da loja. Deixe vazio para ocultar.',
            'support_hours' => 'Horário do suporte',
            'price_display' => 'Preços na loja virtual',
            'low_stock_alerts' => 'Alertas de estoque baixo',
            'weekly_report' => 'Relatório semanal de vendas',
            'report_recipients' => 'Destinatários do relatório',
            'report_recipients_help' => 'Endereços de e-mail (a demo apenas grava os e-mails no log).',
        ],
        'price_display' => [
            'tax_inclusive' => 'Com impostos',
            'tax_exclusive' => 'Sem impostos',
        ],
    ],

    'backups' => [
        'read_only' => 'Somente leitura na demo pública: criar, baixar e excluir backups está desativado. O banco de dados da demo é recriado a cada hora.',
    ],

    'billing' => [
        'compare_plans' => 'Comparar planos',
        'compare_plans_body' => 'A página de planos do plugin Billing lista cada plano com seus recursos. Nenhum pagamento é cobrado na demo.',
        'see_plans' => 'Ver planos',
        'checkout_disabled' => 'O checkout está desativado na demo pública',
        'checkout_disabled_body' => 'Você escolheu o plano :plan. Uma loja real abriria agora o Stripe Checkout; a demo nunca contata um provedor de pagamentos.',
        'contact' => 'Fale conosco',
        'plans' => [
            'boutique' => 'Uma boutique e sua loja online.',
            'maison' => 'Várias boutiques com catálogo e relatórios compartilhados.',
            'enterprise' => 'Franquias, integrações personalizadas e SSO.',
        ],
        'features' => [
            'boutique' => ['1 loja', '5 contas de equipe', 'Suporte por e-mail'],
            'maison' => ['Lojas ilimitadas', 'Equipe ilimitada', 'Helpdesk e análises', 'Suporte prioritário'],
            'enterprise' => ['Gerente de sucesso dedicado', 'Integrações personalizadas', 'Login único (SSO)'],
        ],
    ],

    'storefront' => [
        'pages' => 'Sobre',
        'wholesale' => 'Atacado',
        'support' => 'Suporte',
        'chat' => 'Converse conosco',
        'wholesale_title' => 'Consultas de atacado',
        'wholesale_intro' => 'Hotéis, spas, lojas-conceito e brindes corporativos: este formulário é criado no painel com o plugin Forms (duas etapas, uma pergunta condicional e proteção contra spam).',
        'wholesale_unavailable' => 'As consultas de atacado estão pausadas no momento.',
        'support_title' => 'Atendimento ao cliente',
        'support_intro' => 'O portal do cliente do plugin Helpdesk: abra um ticket, acompanhe a conversa e avalie a resposta.',
        'new_checkout' => 'Novo checkout (beta)',
        'cms_intro' => 'Esta página é gerenciada com o plugin CMS: blocos, rascunhos, pré-visualização ao vivo e uma barra de edição para a equipe conectada.',
    ],
];
