<?php

declare(strict_types=1);

return [
    'resource' => [
        'label' => 'نشاط',
        'plural_label' => 'الأنشطة',
        'navigation_label' => 'سجل النشاط',
    ],

    'relation_manager' => [
        'title' => 'النشاط',
    ],

    'fields' => [
        'log_name' => 'السجل',
        'event' => 'الحدث',
        'description' => 'الوصف',
        'subject' => 'العنصر',
        'subject_type' => 'نوع العنصر',
        'causer' => 'المنفِّذ',
        'created_at' => 'التاريخ',
        'created_from' => 'من',
        'created_until' => 'إلى',
        'changes' => 'التغييرات',
        'attribute' => 'الحقل',
        'old' => 'القيمة القديمة',
        'new' => 'القيمة الجديدة',
        'property' => 'الخاصية',
        'value' => 'القيمة',
    ],

    'sections' => [
        'overview' => 'نظرة عامة',
        'changes' => 'التغييرات',
        'properties' => 'الخصائص',
    ],

    'filters' => [
        'created_from_indicator' => 'من :date',
        'created_until_indicator' => 'حتى :date',
    ],

    'events' => [
        'created' => 'تم الإنشاء',
        'updated' => 'تم التحديث',
        'deleted' => 'تم الحذف',
        'restored' => 'تمت الاستعادة',
    ],

    'causer' => [
        'system' => 'النظام',
    ],

    'timeline' => [
        'label' => 'النشاط',
        'empty' => 'لا يوجد نشاط بعد.',
        'entry' => ':event بواسطة :causer',
    ],

    'empty' => [
        'heading' => 'لا يوجد نشاط بعد',
        'description' => 'ستظهر هنا التغييرات التي تطرأ على سجلاتك.',
    ],
];
