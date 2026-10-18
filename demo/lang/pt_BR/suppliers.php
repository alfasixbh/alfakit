<?php

declare(strict_types=1);

/*
 * Suppliers (an ApiResource over the demo's fake supplier API). Keys match lang/en/suppliers.php.
 */
return [
    'label' => 'fornecedor',
    'plural' => 'fornecedores',
    'navigation' => 'Fornecedores',
    'intro' => 'Os fornecedores ficam em uma API externa (servida pela demo em /demo-api/suppliers), não no banco de dados. A API faz a própria validação: tente um nome que já existe.',
    'fields' => [
        'name' => 'Nome',
        'email' => 'E-mail de pedidos',
        'country' => 'País',
        'category' => 'Categoria',
        'status' => 'Status',
        'lead_time_days' => 'Prazo de entrega',
        'rating' => 'Avaliação',
        'notes' => 'Observações',
        'updated_at' => 'Atualizado',
    ],
    'sections' => [
        'supplier' => 'Fornecedor',
        'terms' => 'Condições',
    ],
    'lead_time' => '{1} :count dia|[2,*] :count dias',
    'categories' => [
        'oud' => 'Oud',
        'florals' => 'Florais',
        'resins' => 'Resinas',
        'citrus' => 'Cítricos',
        'packaging' => 'Embalagens',
    ],
    'statuses' => [
        'active' => 'Ativo',
        'paused' => 'Pausado',
    ],
    'helper' => [
        'country' => 'Código ISO de duas letras, por exemplo FR.',
    ],
];
