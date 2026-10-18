<?php

declare(strict_types=1);

return [
    'label' => 'استيراد :label',
    'column_number' => 'العمود :number',
    'modal' => [
        'heading' => 'استيراد :label',
        'max_rows' => 'يمكن أن تحتوي الملفات على ما يصل إلى :count صف.',
        'submit' => 'استيراد',
        'file' => 'ملف CSV',
        'columns' => 'الأعمدة',
        'skip_column' => 'عدم الاستيراد',
        'example' => 'تنزيل ملف CSV نموذجي',
    ],
    'validation' => [
        'max_rows' => 'يمكن أن يحتوي الملف على :count صف كحد أقصى.',
    ],
    'notifications' => [
        'started' => [
            'title' => 'بدأ الاستيراد',
            'body' => 'جارٍ استيراد :count صف. سيصلك إشعار عند الانتهاء.',
        ],
        'completed' => [
            'title' => 'اكتمل الاستيراد',
            'body' => '{0} لم يتم استيراد أي صف.|[1,*] تم استيراد :count صف.',
            'failed' => 'فشل :count صف.',
            'download_failed_rows' => 'تنزيل الصفوف الفاشلة',
        ],
    ],
    'failures' => [
        'record_not_found' => 'لم يتم العثور على السجل المطلوب تحديثه.',
        'relationship_not_found' => 'لا يوجد :attribute يطابق ":value".',
        'unauthorized' => 'غير مسموح لك بتحديث هذا السجل.',
        'unexpected' => 'تعذّر استيراد الصف.',
    ],
    'failed_rows' => [
        'error' => 'خطأ',
    ],
];
