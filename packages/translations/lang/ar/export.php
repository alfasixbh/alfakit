<?php

declare(strict_types=1);

return [
    'label' => 'تصدير :label',
    'bulk_label' => 'تصدير المحدد',
    'modal' => [
        'heading' => 'تصدير :label',
        'submit' => 'تصدير',
        'columns' => 'الأعمدة',
        'description' => 'يعمل التصدير في الخلفية. سيصلك إشعار عندما تصبح الملفات جاهزة.',
        'column_labels' => 'تسميات الأعمدة',
    ],
    'notifications' => [
        'started' => [
            'title' => 'بدأ التصدير',
            'body' => 'جارٍ تصدير :count صف. سيصلك إشعار عندما تصبح الملفات جاهزة.',
        ],
        'completed' => [
            'title' => 'اكتمل التصدير',
            'body' => '{0} لم يتم تصدير أي صف.|[1,*] تم تصدير :count صف.',
            'failed' => 'فشل :count صف.',
            'download_csv' => 'تنزيل .csv',
            'download_xlsx' => 'تنزيل .xlsx',
        ],
        'max_rows' => [
            'title' => 'عدد الصفوف كبير جدًا',
            'body' => 'يمكنك تصدير :count صف كحد أقصى في المرة الواحدة.',
        ],
    ],
];
