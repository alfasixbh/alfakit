<?php

declare(strict_types=1);

return [
    'dashboard' => [
        'title' => 'Panel',
        'customize' => [
            'span' => '{1} :count columna|[2,*] :count columnas',
            'span_full' => 'Ancho completo',
            'invalid' => 'Este diseño del panel no es válido.',
        ],
    ],
    'global_search' => [
        'placeholder' => 'Buscar…',
        'no_results' => 'No se encontraron resultados.',
    ],
    'resources' => [
        'list' => 'Listado',
        'create' => [
            'title' => 'Crear :label',
            'breadcrumb' => 'Crear',
        ],
        'edit' => [
            'title' => 'Editar :label',
            'breadcrumb' => 'Editar',
        ],
        'view' => [
            'title' => 'Ver :label',
            'breadcrumb' => 'Ver',
        ],
        'api' => [
            'failed' => 'La solicitud ha fallado',
            'unreachable' => 'No se pudo acceder al origen de datos. Inténtalo de nuevo.',
            'error' => 'El origen de datos respondió con un error (:status). Inténtalo de nuevo.',
            'invalid' => 'El origen de datos rechazó los datos.',
        ],
    ],
    'tenancy' => [
        'switch' => 'Cambiar de equipo',
        'register' => 'Nuevo equipo',
        'profile' => 'Configuración del equipo',
    ],
    'errors' => [
        'default' => [
            'title' => 'Algo salió mal',
            'body' => 'No se pudo completar la solicitud. Inténtalo de nuevo.',
        ],
        403 => [
            'title' => 'Acceso denegado',
            'body' => 'No tienes permiso para hacer eso.',
        ],
        404 => [
            'title' => 'No encontrado',
            'body' => 'La página o el registro que buscas no existe.',
        ],
    ],
    'command_palette' => [
        'placeholder' => 'Escribe un comando o busca…',
        'create' => 'Nuevo :label',
    ],
    'realtime' => [
        'conflict' => [
            'refused_title' => 'No guardado: el registro cambió',
            'refused_body' => 'Otra persona guardó este registro después de que lo abrieras. Revisa sus cambios y vuelve a guardar o mantén los tuyos.',
            'yes' => 'Sí',
            'no' => 'No',
        ],
    ],
    'themes' => [
        'neutral' => [
            'label' => 'Neutro',
            'description' => 'El clásico: contenido insertado junto a una barra lateral, encabezados sencillos y tarjetas con borde.',
        ],
        'alfakit' => [
            'label' => 'AlfaKit',
            'description' => 'El diseño distintivo de la marca AlfaKit: Alfa Navy y Fox Orange sobre crema cálida, títulos en Montserrat y texto en Inter, una barra lateral flotante con navegación en píldoras, un banner destacado en cada página, tarjetas elevadas, campos rellenos y botones en forma de píldora.',
        ],
        'minimal' => [
            'label' => 'Minimalista',
            'description' => 'Sin barra lateral: la navegación recorre la parte superior como pestañas subrayadas. Superficies planas con líneas finas, campos subrayados, botones cuadrados, compacto.',
        ],
        'soft' => [
            'label' => 'Suave',
            'description' => 'Un riel de iconos estrecho, títulos grandes con serifa, tarjetas tintadas sin borde, campos rellenos redondeados y tablas a rayas.',
        ],
        'corporate' => [
            'label' => 'Corporativo',
            'description' => 'Barra lateral azul marino con navegación de barra de acento, una franja de título a todo el ancho, superficies cuadradas con borde y tablas a rayas densas.',
        ],
        'filament' => [
            'label' => 'Estilo Filament',
            'description' => 'Lienzo gris, barra lateral transparente, tarjetas blancas con anillo, acentos ámbar e Inter, como FilamentPHP.',
        ],
    ],
    'pwa' => [
        'offline' => [
            'title' => 'Sin conexión',
            'heading' => 'No tienes conexión',
            'body' => 'Comprueba tu conexión. Esta página se recargará sola cuando vuelvas a estar en línea.',
            'retry' => 'Reintentar',
        ],
    ],
];
