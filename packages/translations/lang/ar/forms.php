<?php

declare(strict_types=1);

return [
    'select' => [
        'boolean' => [
            'true' => 'نعم',
            'false' => 'لا',
        ],
        'placeholder' => 'اختر خيارًا',
        'search_prompt' => 'ابدأ الكتابة للبحث…',
        'no_search_results' => 'لا توجد خيارات مطابقة لبحثك.',
        'loading' => 'جارٍ التحميل…',
    ],
    'key_value' => [
        'key' => 'المفتاح',
        'value' => 'القيمة',
        'add' => 'إضافة صف',
        'delete' => 'حذف الصف',
        'reorder' => 'إعادة الترتيب',
    ],
    'repeater' => [
        'cannot_add' => 'لا يمكن إضافة عناصر إلى :attribute.',
        'cannot_delete' => 'لا يمكن إزالة عناصر من :attribute.',
        'cannot_reorder' => 'لا يمكن إعادة ترتيب عناصر :attribute.',
        'add' => 'إضافة إلى :label',
        'delete' => 'حذف',
        'clone' => 'تكرار',
        'move_up' => 'نقل لأعلى',
        'move_down' => 'نقل لأسفل',
        'collapse' => 'طي',
        'expand' => 'توسيع',
        'reorder' => 'إعادة الترتيب',
        'collapse_all' => 'طي الكل',
        'expand_all' => 'توسيع الكل',
    ],
    'wizard' => [
        'next' => 'التالي',
        'previous' => 'السابق',
        'submit' => 'إرسال',
    ],
    'file_upload' => [
        'drop' => 'اسحب الملفات وأفلتها أو',
        'browse' => 'تصفّح',
        'uploading' => 'جارٍ الرفع…',
        'remove' => 'إزالة',
        'download' => 'تنزيل',
        'too_large' => 'هذا الملف كبير جدًا.',
        'invalid_type' => 'نوع الملف هذا غير مسموح به.',
        'too_small' => 'هذا الملف صغير جدًا.',
        'unavailable' => 'لم يعد هذا الملف المرفوع متاحًا. ارفع الملف مرة أخرى.',
        'invalid_dimensions' => 'أبعاد الصورة غير مسموح بها.',
        'invalid_aspect_ratio' => 'نسبة أبعاد الصورة غير مسموح بها.',
        'chunk_failed' => 'الرفع غير مكتمل. ارفع الملف مرة أخرى.',
        'types' => [
            'images' => 'صور',
            'videos' => 'مقاطع فيديو',
            'audio' => 'ملفات صوتية',
            'text' => 'ملفات نصية',
        ],
    ],
    'tags_input' => [
        'placeholder' => 'إضافة وسم…',
    ],
    'rich_editor' => [
        'link_prompt' => 'أدخل عنوان URL',
        'insert_block' => 'إدراج :block',
        'edit_block' => 'تعديل :block',
        'save_block' => 'حفظ',
        'insert' => 'إدراج',
        'text_colors' => [
            'red' => 'أحمر',
            'orange' => 'برتقالي',
            'amber' => 'كهرماني',
            'green' => 'أخضر',
            'teal' => 'أزرق مخضر',
            'blue' => 'أزرق',
            'indigo' => 'نيلي',
            'purple' => 'أرجواني',
            'pink' => 'وردي',
            'gray' => 'رمادي',
        ],
    ],
    'actions' => [
        'save' => 'حفظ التغييرات',
        'create' => 'إنشاء',
        'create_another' => 'إنشاء وإضافة آخر',
        'cancel' => 'إلغاء',
        'saved' => 'تم الحفظ',
        'created' => 'تم الإنشاء',
    ],
    'builder' => [
        'add' => 'إضافة إلى :label',
        'block_max_items' => '{1} يمكن استخدام :block مرة واحدة.|[2,*] يمكن استخدام :block حتى :count مرات.',
    ],
    'slider' => [
        'difference' => 'يجب أن يكون الفرق بين القيم بين :min و:max.',
    ],
    'modal_table_select' => [
        'heading' => 'تحديد :label',
        'select' => 'تحديد',
    ],
    'translatable' => [
        'attribute' => ':attribute (:locale)',
        'editing_language' => 'لغة التحرير',
    ],
    'morph_to_select' => [
        'type' => 'النوع',
    ],
    'icon_picker' => [
        'invalid' => 'الأيقونة المحددة غير متاحة.',
    ],
];
