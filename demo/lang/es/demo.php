<?php

declare(strict_types=1);

/*
 * Spanish demo strings. Keys must match lang/en/demo.php (tests/Feature/TranslationParityTest.php).
 */
return [
    'brand' => 'Maison Alfa',
    'tagline' => 'Perfumería y estilo de vida, seleccionados en Baréin.',

    'navigation' => [
        'catalog' => 'Catálogo',
        'sales' => 'Ventas',
        'customers' => 'Clientes',
        'marketing' => 'Marketing',
        'reports' => 'Informes',
        'settings' => 'Ajustes',
        'showcase' => 'Escaparate',
        'support' => 'Soporte',
        'content' => 'Contenido',
        'system' => 'Sistema',
    ],

    'switcher' => [
        'label' => 'Renderizador',
        'react' => 'React',
        'vue' => 'Vue',
        'svelte' => 'Svelte',
        'current' => ':renderer (actual)',
    ],

    'design' => [
        'theme' => 'Tema',
        'mobile_preset' => 'Ajuste para móvil',
        'mobile_on' => 'Navegación inferior en móviles',
        'mobile_off' => 'Menú lateral en móviles',
    ],

    'footer' => [
        'note' => 'Demo de AlfaKit · se restablece cada hora',
        'docs' => 'Documentación',
    ],

    'meta' => [
        'site' => 'Demo de AlfaKit',
        'title' => 'Maison Alfa · la demo de AlfaKit',
        'panel_title' => 'Administración de Maison Alfa · la demo de AlfaKit',
        'description' => 'Una perfumería ficticia creada con AlfaKit: una única definición de panel de administración de Laravel, renderizada con React, Vue y Svelte. Inicia sesión con la cuenta de demostración compartida; todo se restablece cada hora.',
    ],

    'reset' => [
        'in' => 'Se restablece en :minutes min',
        'soon' => 'Se restablece en menos de un minuto',
        'title' => 'La base de datos y los archivos subidos de la demo se restauran cada hora en punto.',
    ],

    'profile' => [
        'locked_heading' => 'Esta es la cuenta de demostración compartida',
        'locked_body' => 'Su correo electrónico y su contraseña no cambian para que el siguiente visitante pueda iniciar sesión. Aun así, puedes cambiar el nombre visible.',
        'mfa_heading' => 'Autenticación en dos pasos',
        'mfa_body' => 'La configuración está desactivada para la cuenta compartida. Suplanta a un compañero desde Ajustes › Personal para probar la app de autenticación y los códigos por correo.',
    ],

    'errors' => [
        'back_home' => 'Volver a la tienda',
        'open_admin' => 'Abrir el panel de administración',
        '403' => ['title' => 'No disponible para esta cuenta', 'body' => 'Tu rol en esta tienda no incluye esta página. Cambia de tienda o pide acceso a un propietario.'],
        '404' => ['title' => 'Página no encontrada', 'body' => 'Puede que la página se haya movido o que el registro se eliminara con el restablecimiento horario.'],
        '419' => ['title' => 'Página caducada', 'body' => 'Tu sesión ha caducado. Recarga la página e inténtalo de nuevo.'],
        '429' => ['title' => 'Más despacio, por favor', 'body' => 'Demasiadas solicitudes en poco tiempo. Espera un momento e inténtalo de nuevo.'],
        '500' => ['title' => 'Algo ha salido mal', 'body' => 'El error se ha registrado. Inténtalo de nuevo en un momento.'],
        '503' => ['title' => 'Volvemos enseguida', 'body' => 'La demo se está actualizando. Volverá en un minuto.'],
    ],

    'login' => [
        'about' => 'Maison Alfa es una perfumería ficticia cuyo panel de administración está creado con AlfaKit y renderizado con React, Vue o Svelte.',
        'heading' => 'Cuenta de demostración',
        'hint' => 'Inicia sesión con :email y la contraseña :password. Todo lo que cambies se restablece cada hora.',
        'fill' => 'Usar la cuenta de demostración',
    ],

    'storefront' => [
        'title' => 'Maison Alfa',
        'nav' => [
            'home' => 'Inicio',
            'contact' => 'Contacto',
            'track' => 'Seguir un pedido',
            'admin' => 'Abrir el panel de administración',
        ],
        'hero' => [
            'eyebrow' => 'La tienda de demostración de AlfaKit',
            'title' => 'Aromas con historia, software con carácter.',
            'body' => 'Maison Alfa es una casa de perfumes ficticia que existe para mostrar lo que renderiza AlfaKit: una aplicación Laravel, una definición de panel de administración, tres frontends. Recorre la tienda y abre después el mismo panel en React, Vue o Svelte.',
            'cta' => 'Abrir el panel de administración',
            'secondary' => 'Leer la documentación',
        ],
        'featured' => 'Destacados de la temporada',
        'from' => 'Desde :price',
        'notes' => 'Salida :top · Corazón :heart · Fondo :base',
        'by' => 'de :brand',
        'empty' => 'Todavía no hay productos destacados. Ejecuta php artisan demo:reset para cargar la tienda.',
        'footer' => [
            'beta' => 'Beta pública de AlfaKit',
            'built' => 'Creado con AlfaKit por Alfa Six. Tienda ficticia, software real.',
            'renderer' => 'Renderizado con :renderer',
        ],
    ],

    'product_status' => [
        'draft' => 'Borrador',
        'active' => 'Activo',
        'archived' => 'Archivado',
    ],
    'order_status' => [
        'pending' => 'Pendiente',
        'paid' => 'Pagado',
        'processing' => 'En preparación',
        'shipped' => 'Enviado',
        'delivered' => 'Entregado',
        'cancelled' => 'Cancelado',
        'refunded' => 'Reembolsado',
    ],
    'payment_method' => [
        'card' => 'Tarjeta',
        'apple_pay' => 'Apple Pay',
        'paypal' => 'PayPal',
        'bank_transfer' => 'Transferencia bancaria',
        'cash_on_delivery' => 'Contra reembolso',
    ],
    'payment_status' => [
        'pending' => 'Pendiente',
        'captured' => 'Cobrado',
        'failed' => 'Fallido',
        'refunded' => 'Reembolsado',
    ],
    'shipment_status' => [
        'pending' => 'Pendiente',
        'in_transit' => 'En tránsito',
        'delivered' => 'Entregado',
        'returned' => 'Devuelto',
    ],
    'review_status' => [
        'pending' => 'Pendiente',
        'approved' => 'Aprobada',
        'rejected' => 'Rechazada',
    ],
    'discount_type' => [
        'percentage' => 'Porcentaje',
        'fixed' => 'Importe fijo',
        'free_shipping' => 'Envío gratuito',
    ],
    'staff_role' => [
        'owner' => 'Propietario',
        'manager' => 'Gerente',
        'staff' => 'Personal',
    ],
    'concentration' => [
        'extrait' => 'Extrait de parfum',
        'parfum' => 'Parfum',
        'eau_de_parfum' => 'Eau de parfum',
        'eau_de_toilette' => 'Eau de toilette',
        'body_mist' => 'Bruma corporal',
        'candle' => 'Vela aromática',
        'diffuser' => 'Difusor de varillas',
    ],
    'audience' => [
        'unisex' => 'Unisex',
        'women' => 'Mujer',
        'men' => 'Hombre',
    ],

    'timeline' => [
        'placed' => 'Pedido realizado',
        'paid' => 'Pago cobrado',
        'processing' => 'Preparado y embalado',
        'shipped' => 'Entregado a :carrier',
        'delivered' => 'Entregado',
        'cancelled' => 'Cancelado por el cliente',
        'refunded' => 'Reembolso emitido',
    ],
];
