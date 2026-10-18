<?php

declare(strict_types=1);

return [
    'page' => [
        'title' => 'سلامة التطبيق',
        'navigation_label' => 'السلامة',
        'last_ran' => 'آخر فحص :time',
        'never_ran' => 'لم يتم تشغيل الفحوصات بعد.',
    ],

    'results' => [
        'details' => 'التفاصيل',
        'columns' => [
            'check' => 'الفحص',
            'status' => 'الحالة',
            'summary' => 'الملخص',
            'message' => 'الرسالة',
            'meta' => 'التفاصيل',
        ],
        'empty' => [
            'heading' => 'لا توجد نتائج بعد',
            'description' => 'حدّث الصفحة لتشغيل فحوصات السلامة.',
        ],
    ],

    'statuses' => [
        'ok' => 'سليم',
        'warning' => 'تحذير',
        'failed' => 'فشل',
        'crashed' => 'تعطّل',
        'skipped' => 'تم التخطي',
        'unknown' => 'غير معروف',
    ],

    'actions' => [
        'refresh' => [
            'label' => 'تحديث',
            'notification' => 'تم تحديث فحوصات السلامة',
        ],
    ],

    'checks' => [
        'backups' => 'النسخ الاحتياطية',
        'cache' => 'ذاكرة التخزين المؤقت',
        'cpu_load' => 'حمل المعالج',
        'database' => 'قاعدة البيانات',
        'database_connection_count' => 'اتصالات قاعدة البيانات',
        'database_size' => 'حجم قاعدة البيانات',
        'database_table_size' => 'حجم جداول قاعدة البيانات',
        'debug_mode' => 'وضع التصحيح',
        'environment' => 'البيئة',
        'flare_error_occurrence_count' => 'أخطاء Flare',
        'horizon' => 'Horizon',
        'meilisearch' => 'Meilisearch',
        'optimized_app' => 'تحسين التطبيق',
        'ping' => 'Ping',
        'queue' => 'قائمة الانتظار',
        'redis' => 'Redis',
        'redis_memory_usage' => 'استخدام ذاكرة Redis',
        'schedule' => 'الجدولة',
        'security_advisories' => 'التنبيهات الأمنية',
        'used_disk_space' => 'مساحة القرص المستخدمة',
    ],

    'widget' => [
        'label' => 'سلامة التطبيق',
        'ok' => 'نجحت جميع الفحوصات',
        'failing' => '{1} فشل :count فحص|[2,*] فشلت :count فحوصات',
        'warnings' => '{1} :count تحذير|[2,*] :count تحذيرات',
        'never_ran' => 'لم يتم الفحص بعد',
    ],
];
