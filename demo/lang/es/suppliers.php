<?php

declare(strict_types=1);

/*
 * Suppliers (an ApiResource over the demo's fake supplier API). Keys match lang/en/suppliers.php.
 */
return [
    'label' => 'proveedor',
    'plural' => 'proveedores',
    'navigation' => 'Proveedores',
    'intro' => 'Los proveedores están en una API externa (servida por la demo en /demo-api/suppliers), no en la base de datos. La API valida por su cuenta: prueba con un nombre que ya exista.',
    'fields' => [
        'name' => 'Nombre',
        'email' => 'Correo para pedidos',
        'country' => 'País',
        'category' => 'Categoría',
        'status' => 'Estado',
        'lead_time_days' => 'Plazo de entrega',
        'rating' => 'Valoración',
        'notes' => 'Notas',
        'updated_at' => 'Actualizado',
    ],
    'sections' => [
        'supplier' => 'Proveedor',
        'terms' => 'Condiciones',
    ],
    'lead_time' => '{1} :count día|[2,*] :count días',
    'categories' => [
        'oud' => 'Oud',
        'florals' => 'Florales',
        'resins' => 'Resinas',
        'citrus' => 'Cítricos',
        'packaging' => 'Embalaje',
    ],
    'statuses' => [
        'active' => 'Activo',
        'paused' => 'En pausa',
    ],
    'helper' => [
        'country' => 'Código ISO de dos letras, p. ej., FR.',
    ],
];
