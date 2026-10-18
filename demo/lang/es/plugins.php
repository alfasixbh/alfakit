<?php

declare(strict_types=1);

/*
 * Spanish strings of the first-party plugin integration. Keys match lang/en/plugins.php.
 */
return [
    'commands' => [
        'group' => 'Maison Alfa',
        'order_board' => 'Abrir el tablero de pedidos',
        'calendar' => 'Abrir el calendario de la tienda',
        'returns' => 'Revisar devoluciones',
        'category_tree' => 'Ordenar el árbol de categorías',
        'new_product' => 'Añadir un producto',
        'storefront' => 'Abrir la tienda online',
    ],

    'board' => [
        'title' => 'Tablero de pedidos',
        'subheading' => 'Arrastra los pedidos a lo largo del flujo de preparación o muévelos con el teclado (Espacio, flechas, Espacio). Los últimos 60 días.',
        'open' => 'Tablero',
        'timeline_note' => 'Movido en el tablero de pedidos por :user',
    ],

    'calendar' => [
        'title' => 'Calendario',
        'subheading' => 'Promociones, envíos, entregas y páginas programadas de esta tienda.',
        'this_week' => 'Esta semana',
        'new_promotion' => 'Planificar una promoción',
        'hint' => 'Arrastra una promoción para moverla, arrastra su final para cambiar su duración, haz clic para editarla o selecciona días para planificar una nueva.',
        'fields' => [
            'value' => 'Valor (% o importe)',
        ],
        'legend' => [
            'label' => 'Leyenda',
            'percentage' => 'Promoción: porcentaje de descuento',
            'fixed' => 'Promoción: importe de descuento',
            'free_shipping' => 'Promoción: envío gratuito',
            'shipped' => 'El envío salió de la boutique',
            'delivered' => 'Entregado',
            'publish' => 'Página programada',
        ],
        'events' => [
            'shipped' => ':number enviado (:carrier)',
            'delivered' => ':number entregado',
            'publish' => 'Publicar: :title',
        ],
    ],

    'returns' => [
        'label' => 'devolución',
        'plural' => 'Devoluciones',
        'workflow' => 'Aprobación de devoluciones',
        'subheading' => 'Soporte abre una devolución desde un pedido y la envía; un propietario o gerente la aprueba desde Aprobaciones; las devoluciones aprobadas se reembolsan.',
        'empty' => 'Todavía no hay devoluciones',
        'request' => 'Solicitar una devolución',
        'request_heading' => 'Devolución del pedido :number',
        'created' => 'Devolución :number abierta. Envíala a aprobación cuando esté completa.',
        'timeline_note' => 'Reembolsado mediante la devolución :number',
        'states' => [
            'requested' => 'Solicitada',
            'awaiting_approval' => 'Pendiente de aprobación',
            'approved' => 'Aprobada',
            'rejected' => 'Rechazada',
            'refunded' => 'Reembolsada',
            'closed' => 'Cerrada',
        ],
        'transitions' => [
            'submit' => 'Enviar a aprobación',
            'refund' => 'Reembolsar',
            'reopen' => 'Reabrir',
            'close' => 'Cerrar',
        ],
        'steps' => [
            'manager' => 'Aprobación del gerente',
        ],
        'reasons' => [
            'damaged' => 'Dañado en el transporte',
            'wrong_item' => 'Artículo equivocado',
            'not_as_described' => 'No coincide con la descripción',
            'allergy' => 'Reacción cutánea',
            'changed_mind' => 'Cambio de opinión',
        ],
        'fields' => [
            'number' => 'Devolución',
            'state' => 'Estado',
            'reason' => 'Motivo',
            'amount' => 'Importe del reembolso',
            'details' => 'Detalles',
            'requested_by' => 'Abierta por',
            'refund_reference' => 'Referencia del reembolso',
        ],
        'sections' => [
            'workflow' => 'Flujo de trabajo',
            'history' => 'Historial',
            'details' => 'Devolución',
        ],
    ],

    'invoices' => [
        'issue' => 'Emitir factura',
        'open' => 'Abrir factura',
        'issue_description' => 'Crea una factura a partir de las líneas del pedido, con el IVA según los tipos impositivos de la tienda.',
        'notes' => 'Factura del pedido :number. Gracias por comprar en Maison Alfa.',
        'terms' => 'Pago en un plazo de 14 días. Documento de ejemplo de la demo de AlfaKit.',
    ],

    'comments' => [
        'section' => 'Comentarios internos',
        'section_description' => 'Solo los ve el personal. Escribe @ para mencionar a un compañero; recibirá un aviso en la campana.',
    ],

    'activity' => [
        'section' => 'Registro de auditoría',
    ],

    'helpdesk' => [
        'greeting' => '¡Hola! Pregúntanos lo que quieras sobre nuestras fragancias o tu pedido.',
    ],

    'tree' => [
        'title' => 'Árbol de categorías',
        'subheading' => 'Arrastra las categorías para anidarlas o reordenarlas (o usa los botones de flecha) y guarda. Las categorías son comunes a todas las tiendas.',
        'open' => 'Vista de árbol',
    ],

    'tags' => [
        'segments' => 'Segmentos',
    ],

    'media' => [
        'gallery' => 'Galería de estilo de vida',
        'gallery_description' => 'Imágenes adicionales guardadas en la mediateca (aparte de las imágenes del producto de arriba).',
    ],

    'views' => [
        'low_stock' => 'Stock bajo',
        'featured' => 'Destacados',
        'drafts' => 'Borradores',
    ],

    'ai' => [
        'summarise_reviews' => 'Resumir reseñas',
        'summarise_heading' => 'Lo que dicen los clientes de :name',
        'summarise_prompt' => 'Resume estas reseñas de clientes del perfume «:name» en tres viñetas breves: lo que les encanta, lo que critican y a quién le va bien.',
    ],

    'settings' => [
        'title' => 'Ajustes de la casa',
        'subheading' => 'Comunes a todas las tiendas de Maison Alfa. La tienda online muestra el anuncio.',
        'sections' => [
            'brand' => 'Casa y tienda online',
            'notifications' => 'Notificaciones',
        ],
        'fields' => [
            'house_name' => 'Nombre de la casa',
            'announcement' => 'Anuncio de la tienda online',
            'announcement_help' => 'Se muestra en la parte superior de cada página de la tienda. Déjalo vacío para ocultarlo.',
            'support_hours' => 'Horario de soporte',
            'price_display' => 'Precios en la tienda online',
            'low_stock_alerts' => 'Alertas de stock bajo',
            'weekly_report' => 'Informe semanal de ventas',
            'report_recipients' => 'Destinatarios del informe',
            'report_recipients_help' => 'Direcciones de correo (la demo solo escribe los correos en el registro).',
        ],
        'price_display' => [
            'tax_inclusive' => 'IVA incluido',
            'tax_exclusive' => 'IVA no incluido',
        ],
    ],

    'backups' => [
        'read_only' => 'Solo lectura en la demo pública: crear, descargar y eliminar copias de seguridad está desactivado. La base de datos de la demo se reconstruye cada hora.',
    ],

    'billing' => [
        'compare_plans' => 'Comparar planes',
        'compare_plans_body' => 'La página de planes del plugin Billing muestra cada plan con sus funciones. En la demo nunca se cobra nada.',
        'see_plans' => 'Ver planes',
        'checkout_disabled' => 'El pago está desactivado en la demo pública',
        'checkout_disabled_body' => 'Has elegido el plan :plan. Una tienda real abriría ahora Stripe Checkout; la demo nunca contacta con un proveedor de pagos.',
        'contact' => 'Habla con nosotros',
        'plans' => [
            'boutique' => 'Una boutique y su tienda online.',
            'maison' => 'Varias boutiques con catálogo e informes compartidos.',
            'enterprise' => 'Franquicias, integraciones a medida y SSO.',
        ],
        'features' => [
            'boutique' => ['1 tienda', '5 cuentas de personal', 'Soporte por correo'],
            'maison' => ['Tiendas ilimitadas', 'Personal ilimitado', 'Helpdesk y analítica', 'Soporte prioritario'],
            'enterprise' => ['Gestor de éxito dedicado', 'Integraciones a medida', 'Inicio de sesión único'],
        ],
    ],

    'storefront' => [
        'pages' => 'Sobre nosotros',
        'wholesale' => 'Venta al por mayor',
        'support' => 'Soporte',
        'chat' => 'Chatea con nosotros',
        'wholesale_title' => 'Consultas de venta al por mayor',
        'wholesale_intro' => 'Hoteles, spas, concept stores y regalos de empresa: este formulario se crea en el panel con el plugin Forms (dos pasos, una pregunta condicional y protección contra spam).',
        'wholesale_unavailable' => 'Las consultas de venta al por mayor están en pausa por ahora.',
        'support_title' => 'Atención al cliente',
        'support_intro' => 'El portal de clientes del plugin Helpdesk: abre un ticket, sigue la conversación y valora la respuesta.',
        'new_checkout' => 'Nuevo proceso de pago (beta)',
        'cms_intro' => 'Esta página se gestiona con el plugin CMS: bloques, borradores, vista previa en directo y una barra de edición para el personal que ha iniciado sesión.',
    ],
];
