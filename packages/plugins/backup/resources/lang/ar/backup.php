<?php

declare(strict_types=1);

return [
    'page' => [
        'title' => 'النسخ الاحتياطية',
        'navigation_label' => 'النسخ الاحتياطية',
    ],

    'table' => [
        'heading' => 'النسخ الاحتياطية',
        'columns' => [
            'name' => 'النسخة الاحتياطية',
            'disk' => 'القرص',
            'date' => 'التاريخ',
            'size' => 'الحجم',
        ],
        'filters' => [
            'disk' => 'القرص',
        ],
        'empty' => [
            'heading' => 'لا توجد نسخ احتياطية بعد',
            'description' => 'أنشئ نسخة احتياطية لتظهر هنا.',
        ],
    ],

    'destinations' => [
        'heading' => 'وجهات النسخ الاحتياطي',
        'label' => ':name على :disk',
        'healthy' => 'سليمة',
        'unhealthy' => 'غير سليمة',
        'unreachable' => 'يتعذر الوصول إليها',
        'summary' => '{0} لا توجد نسخ احتياطية · المستخدم :size|{1} :count نسخة احتياطية · المستخدم :size · الأحدث :newest|[2,*] :count نسخ احتياطية · المستخدم :size · الأحدث :newest',
    ],

    'actions' => [
        'create' => [
            'label' => 'إنشاء نسخة احتياطية',
            'modal_heading' => 'إنشاء نسخة احتياطية',
            'modal_description' => 'يعمل النسخ الاحتياطي في الخلفية، وتظهر النسخة في القائمة عند اكتمالها.',
            'submit' => 'إنشاء نسخة احتياطية',
            'option' => 'نسخ احتياطي لـ',
            'options' => [
                'all' => 'قاعدة البيانات والملفات',
                'only_db' => 'قاعدة البيانات فقط',
                'only_files' => 'الملفات فقط',
            ],
            'notification' => 'جارٍ إنشاء نسخة احتياطية جديدة في الخلفية',
        ],
        'download' => [
            'label' => 'تنزيل',
        ],
        'delete' => [
            'label' => 'حذف',
            'modal_heading' => 'حذف النسخة الاحتياطية',
            'modal_description' => 'هل تريد حذف :name؟ لا يمكن التراجع عن هذا الإجراء.',
            'submit' => 'حذف',
            'notification' => 'تم حذف النسخة الاحتياطية',
        ],
    ],
];
