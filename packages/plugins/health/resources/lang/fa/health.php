<?php

declare(strict_types=1);

return [
    'page' => [
        'title' => 'سلامت برنامه',
        'navigation_label' => 'سلامت',
        'last_ran' => 'بررسی‌شده :time',
        'never_ran' => 'بررسی‌ها هنوز اجرا نشده‌اند.',
    ],

    'results' => [
        'details' => 'جزئیات',
        'columns' => [
            'check' => 'بررسی',
            'status' => 'وضعیت',
            'summary' => 'خلاصه',
            'message' => 'پیام',
            'meta' => 'جزئیات',
        ],
        'empty' => [
            'heading' => 'هنوز نتیجه‌ای وجود ندارد',
            'description' => 'برای اجرای بررسی‌های سلامت، بازخوانی کنید.',
        ],
    ],

    'statuses' => [
        'ok' => 'سالم',
        'warning' => 'هشدار',
        'failed' => 'ناموفق',
        'crashed' => 'از کار افتاده',
        'skipped' => 'رد شده',
        'unknown' => 'نامشخص',
    ],

    'actions' => [
        'refresh' => [
            'label' => 'بازخوانی',
            'notification' => 'بررسی‌های سلامت بازخوانی شدند',
        ],
    ],

    'checks' => [
        'backups' => 'پشتیبان‌ها',
        'cache' => 'حافظه نهان',
        'cpu_load' => 'بار پردازنده',
        'database' => 'پایگاه داده',
        'database_connection_count' => 'اتصال‌های پایگاه داده',
        'database_size' => 'حجم پایگاه داده',
        'database_table_size' => 'حجم جدول‌های پایگاه داده',
        'debug_mode' => 'حالت اشکال‌زدایی',
        'environment' => 'محیط',
        'flare_error_occurrence_count' => 'خطاهای Flare',
        'horizon' => 'Horizon',
        'meilisearch' => 'Meilisearch',
        'optimized_app' => 'بهینه‌سازی برنامه',
        'ping' => 'پینگ',
        'queue' => 'صف',
        'redis' => 'Redis',
        'redis_memory_usage' => 'مصرف حافظه Redis',
        'schedule' => 'زمان‌بندی',
        'security_advisories' => 'هشدارهای امنیتی',
        'used_disk_space' => 'فضای دیسک استفاده‌شده',
    ],

    'widget' => [
        'label' => 'سلامت برنامه',
        'ok' => 'همهٔ بررسی‌ها موفق بودند',
        'failing' => '{1} :count بررسی ناموفق|[2,*] :count بررسی ناموفق',
        'warnings' => '{1} :count هشدار|[2,*] :count هشدار',
        'never_ran' => 'هنوز بررسی نشده',
    ],
];
