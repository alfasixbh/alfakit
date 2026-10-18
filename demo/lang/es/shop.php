<?php

declare(strict_types=1);

/*
 * Spanish storefront strings. Keys match lang/en/shop.php (tests/Feature/ShopTranslationParityTest.php).
 */
return [
    'attributes' => [
        'name' => 'nombre',
        'rating' => 'valoración',
        'review' => 'reseña',
    ],

    'locale' => [
        'label' => 'Idioma',
    ],

    'strip' => [
        'eyebrow' => 'Creado con AlfaKit',
        'title' => 'Una definición de panel, tres frontends.',
        'body' => 'Todo lo que ves aquí se renderiza a partir del mismo esquema PHP. Cambia de renderizador y la página se recarga en React, Vue o Svelte con el mismo marcado, el mismo estilo y el mismo comportamiento.',
        'cta' => 'Cambiar de renderizador',
        'hint' => 'Estás viendo la versión :renderer.',
        'mascot_alt' => 'El zorro, mascota de AlfaKit',
    ],

    'newsletter' => [
        'heading' => 'Cartas desde el taller',
        'body' => 'Un aviso cuando llega un nuevo aroma, nunca más de dos veces al mes.',
        'label' => 'Correo electrónico',
        'placeholder' => 'tu@example.com',
        'submit' => 'Suscribirse',
        'duplicate' => 'Esta dirección ya está en la lista.',
        'thanks' => [
            'title' => 'Ya estás en la lista',
            'body' => 'La próxima carta de Maison Alfa te llegará antes que a nadie.',
        ],
    ],

    'product' => [
        'back' => 'Todos los productos',
        'by' => 'de :brand',
        'sku' => 'Referencia',
        'gallery' => 'Galería',
        'image_of' => ':name, vista :index',
        'sizes' => 'Tamaños',
        'choose_size' => 'Elige un tamaño',
        'stock' => [
            'in' => 'En stock',
            'low' => 'Solo quedan :count',
            'out' => 'Agotado',
        ],
        'notes' => [
            'heading' => 'Composición',
            'top' => 'Notas de salida',
            'heart' => 'Notas de corazón',
            'base' => 'Notas de fondo',
        ],
        'details' => [
            'heading' => 'Detalles',
            'concentration' => 'Concentración',
            'audience' => 'Para',
            'size' => 'Tamaño',
            'category' => 'Categoría',
            'tags' => 'Etiquetas',
        ],
        'enquire' => 'Preguntar por este aroma',
        'track' => 'Seguir un pedido',
        'reviews' => [
            'heading' => 'Reseñas',
            'count' => '{0} Aún no hay reseñas|{1} Una reseña|[2,*] :count reseñas',
            'average' => ':average de 5',
            'empty' => 'Aún no hay reseñas. Sé el primero en contar qué tal se lleva.',
            'verified' => 'Compra verificada',
            'guest' => 'Invitado',
            'write' => 'Escribir una reseña',
            'write_help' => 'El equipo lee las reseñas y las publica desde el panel de administración, normalmente en un día.',
        ],
        'related' => 'También te puede gustar',
        'compare' => 'Antes :price',
        'currency_note' => 'Precios en dólares estadounidenses, impuestos incluidos.',
    ],

    'review' => [
        'fields' => [
            'rating' => 'Tu valoración',
            'name' => 'Tu nombre',
            'email' => 'Correo electrónico',
            'email_help' => 'Nunca se muestra. Si compraste este aroma con nosotros, tu reseña se marca como compra verificada.',
            'title' => 'Titular',
            'body' => 'Tu reseña',
        ],
        'submit' => 'Enviar reseña',
        'thanks' => [
            'title' => 'Gracias, :name',
            'body' => 'Tu reseña está en manos del equipo y aparecerá cuando se apruebe en el panel de administración.',
        ],
    ],

    'contact' => [
        'heading' => 'Escribe a la casa',
        'intro' => 'Una pregunta sobre un pedido, un aroma que no encuentras, venta al por mayor o prensa: el equipo de Manama lee cada mensaje y responde en dos días laborables.',
        'form_heading' => 'Enviar un mensaje',
        'form_help' => 'Este es un formulario independiente de AlfaKit: la validación se ejecuta en el servidor, el tema muestra un campo de número de pedido y el botón de envío tiene límite de frecuencia.',
        'details' => [
            'heading' => 'La boutique',
            'email' => 'Correo electrónico',
            'phone' => 'Teléfono',
            'hours' => 'Horario',
            'hours_value' => 'De sábado a jueves, de 10:00 a 22:00',
            'address' => 'Bahrain Bay, Manama',
        ],
        'fields' => [
            'name' => 'Tu nombre',
            'email' => 'Correo electrónico',
            'topic' => 'Tema',
            'order_number' => 'Número de pedido',
            'message' => 'Mensaje',
            'message_help' => 'Al menos 20 caracteres. Indica el aroma o el pedido del que nos escribes.',
        ],
        'topics' => [
            'order' => 'Un pedido',
            'product' => 'Un producto',
            'wholesale' => 'Venta al por mayor',
            'press' => 'Prensa',
            'other' => 'Otra cosa',
        ],
        'prefill' => 'Me gustaría saber más sobre :product.',
        'submit' => 'Enviar mensaje',
        'mail_subject' => 'Contacto de Maison Alfa: :topic',
        'thanks' => [
            'title' => 'Gracias, :name',
            'body' => 'Responderemos a :email en dos días laborables.',
        ],
        'rate_limited' => 'Ya has enviado varios mensajes',
    ],

    'track' => [
        'heading' => 'Seguir un pedido',
        'intro' => 'Introduce el correo que usaste al pagar y el número de pedido de tu confirmación. Verás todos los pedidos de esa cuenta y el recorrido completo del que buscas.',
        'fields' => [
            'email' => 'Correo usado al pagar',
            'number' => 'Número de pedido',
            'submit' => 'Buscar mi pedido',
        ],
        'sample' => [
            'heading' => 'Pruébalo con un pedido real',
            'body' => 'Esta es una tienda de demostración, así que aquí tienes un pedido generado que puedes consultar:',
            'use' => 'Usar este pedido',
        ],
        'not_found' => [
            'heading' => 'No hemos encontrado ese pedido',
            'body' => 'Revisa el correo y el número de pedido, o usa el pedido de ejemplo de abajo.',
        ],
        'orders' => [
            'heading' => 'Tus pedidos',
            'description' => 'Todo lo que ha pedido :name. Haz clic en un pedido para ver su cronología.',
            'number' => 'Pedido',
            'placed' => 'Realizado',
            'items' => 'Artículos',
            'status' => 'Estado',
            'total' => 'Total',
            'search' => 'Buscar por número de pedido',
        ],
        'timeline' => [
            'heading' => 'Pedido :number',
            'description' => 'Cada paso, desde el pago hasta tu puerta.',
            'steps' => 'Cronología',
            'carrier' => 'Transportista',
            'tracking' => 'Número de seguimiento',
            'ship_to' => 'Envío a',
            'no_shipment' => 'Aún no enviado',
            'no_tracking' => 'Disponible tras el envío',
        ],
        'components_note' => 'La tabla de pedidos y la cronología son componentes independientes de AlfaKit: una Table y una Infolist renderizadas en el diseño de la tienda.',
    ],
];
