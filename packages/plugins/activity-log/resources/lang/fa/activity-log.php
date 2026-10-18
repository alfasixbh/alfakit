<?php

declare(strict_types=1);

return [
    'resource' => [
        'label' => 'فعالیت',
        'plural_label' => 'فعالیت‌ها',
        'navigation_label' => 'گزارش فعالیت',
    ],

    'relation_manager' => [
        'title' => 'فعالیت',
    ],

    'fields' => [
        'log_name' => 'گزارش',
        'event' => 'رویداد',
        'description' => 'توضیحات',
        'subject' => 'موضوع',
        'subject_type' => 'نوع موضوع',
        'causer' => 'انجام‌دهنده',
        'created_at' => 'تاریخ',
        'created_from' => 'از',
        'created_until' => 'تا',
        'changes' => 'تغییرات',
        'attribute' => 'فیلد',
        'old' => 'مقدار قبلی',
        'new' => 'مقدار جدید',
        'property' => 'ویژگی',
        'value' => 'مقدار',
    ],

    'sections' => [
        'overview' => 'نمای کلی',
        'changes' => 'تغییرات',
        'properties' => 'ویژگی‌ها',
    ],

    'filters' => [
        'created_from_indicator' => 'از :date',
        'created_until_indicator' => 'تا :date',
    ],

    'events' => [
        'created' => 'ایجاد شد',
        'updated' => 'به‌روزرسانی شد',
        'deleted' => 'حذف شد',
        'restored' => 'بازیابی شد',
    ],

    'causer' => [
        'system' => 'سیستم',
    ],

    'timeline' => [
        'label' => 'فعالیت',
        'empty' => 'هنوز فعالیتی ثبت نشده است.',
        'entry' => ':event توسط :causer',
    ],

    'empty' => [
        'heading' => 'هنوز فعالیتی ثبت نشده است',
        'description' => 'تغییرات رکوردهای شما در اینجا فهرست می‌شود.',
    ],
];
