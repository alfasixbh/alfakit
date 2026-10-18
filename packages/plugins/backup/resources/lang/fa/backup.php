<?php

declare(strict_types=1);

return [
    'page' => [
        'title' => 'پشتیبان‌ها',
        'navigation_label' => 'پشتیبان‌ها',
    ],

    'table' => [
        'heading' => 'پشتیبان‌ها',
        'columns' => [
            'name' => 'پشتیبان',
            'disk' => 'دیسک',
            'date' => 'تاریخ',
            'size' => 'حجم',
        ],
        'filters' => [
            'disk' => 'دیسک',
        ],
        'empty' => [
            'heading' => 'هنوز پشتیبانی وجود ندارد',
            'description' => 'یک پشتیبان ایجاد کنید تا در اینجا نمایش داده شود.',
        ],
    ],

    'destinations' => [
        'heading' => 'مقصدهای پشتیبان',
        'label' => ':name روی :disk',
        'healthy' => 'سالم',
        'unhealthy' => 'ناسالم',
        'unreachable' => 'غیرقابل دسترس',
        'summary' => '{0} بدون پشتیبان · :size استفاده‌شده|{1} :count پشتیبان · :size استفاده‌شده · جدیدترین :newest|[2,*] :count پشتیبان · :size استفاده‌شده · جدیدترین :newest',
    ],

    'actions' => [
        'create' => [
            'label' => 'ایجاد پشتیبان',
            'modal_heading' => 'ایجاد پشتیبان',
            'modal_description' => 'پشتیبان‌گیری در پس‌زمینه انجام می‌شود و پس از اتمام در فهرست نمایش داده می‌شود.',
            'submit' => 'ایجاد پشتیبان',
            'option' => 'پشتیبان‌گیری از',
            'options' => [
                'all' => 'پایگاه داده و فایل‌ها',
                'only_db' => 'فقط پایگاه داده',
                'only_files' => 'فقط فایل‌ها',
            ],
            'notification' => 'در حال ایجاد پشتیبان جدید در پس‌زمینه',
        ],
        'download' => [
            'label' => 'دانلود',
        ],
        'delete' => [
            'label' => 'حذف',
            'modal_heading' => 'حذف پشتیبان',
            'modal_description' => ':name حذف شود؟ این عمل قابل بازگشت نیست.',
            'submit' => 'حذف',
            'notification' => 'پشتیبان حذف شد',
        ],
    ],
];
