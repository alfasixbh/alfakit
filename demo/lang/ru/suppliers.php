<?php

declare(strict_types=1);

/*
 * Suppliers (an ApiResource over the demo's fake supplier API). Keys match lang/en/suppliers.php.
 */
return [
    'label' => 'поставщик',
    'plural' => 'поставщики',
    'navigation' => 'Поставщики',
    'intro' => 'Поставщики хранятся во внешнем API (демо отдаёт его по адресу /demo-api/suppliers), а не в базе данных. API проверяет данные само: попробуйте имя, которое уже существует.',
    'fields' => [
        'name' => 'Название',
        'email' => 'E-mail для заказов',
        'country' => 'Страна',
        'category' => 'Категория',
        'status' => 'Статус',
        'lead_time_days' => 'Срок поставки',
        'rating' => 'Рейтинг',
        'notes' => 'Заметки',
        'updated_at' => 'Обновлено',
    ],
    'sections' => [
        'supplier' => 'Поставщик',
        'terms' => 'Условия',
    ],
    'lead_time' => '{1} :count день|[2,4] :count дня|[5,*] :count дней',
    'categories' => [
        'oud' => 'Уд',
        'florals' => 'Цветочные',
        'resins' => 'Смолы',
        'citrus' => 'Цитрусовые',
        'packaging' => 'Упаковка',
    ],
    'statuses' => [
        'active' => 'Активен',
        'paused' => 'Приостановлен',
    ],
    'helper' => [
        'country' => 'Двухбуквенный код ISO, например FR.',
    ],
];
