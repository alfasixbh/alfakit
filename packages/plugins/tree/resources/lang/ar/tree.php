<?php

declare(strict_types=1);

return [

    'notifications' => [
        'saved' => 'تم حفظ الترتيب',
    ],

    // Node buttons: they name the node, like the move buttons.
    'actions' => [
        'view' => 'عرض :title',
        'edit' => 'تعديل :title',
        'delete' => 'حذف :title',
    ],

    'validation' => [
        'invalid' => 'تعذرت قراءة الشجرة.',
        'unknown_record' => 'أحد السجلات في الشجرة لم يعد موجودًا. أعد تحميل الصفحة وحاول مرة أخرى.',
        'duplicate_record' => 'يظهر أحد السجلات أكثر من مرة في الشجرة.',
        'unknown_parent' => 'أحد السجلات الأصلية لم يعد موجودًا. أعد تحميل الصفحة وحاول مرة أخرى.',
        'cycle' => 'لا يمكن نقل سجل إلى داخل نفسه.',
        'max_depth' => 'يمكن أن يصل عمق الشجرة إلى :depth مستويات كحد أقصى.',
    ],

    // Shared with the renderers as `tree.*` (see TreePlugin::register()).
    'ui' => [
        'label' => 'الشجرة',
        'expand_all' => 'توسيع الكل',
        'collapse_all' => 'طي الكل',
        'expand' => 'توسيع :title',
        'collapse' => 'طي :title',
        'move_up' => 'نقل :title إلى الأعلى',
        'move_down' => 'نقل :title إلى الأسفل',
        'indent' => 'نقل :title إلى داخل العنصر السابق',
        'outdent' => 'نقل :title خارج العنصر الأصل',
        'save' => 'حفظ الترتيب',
        'saving' => 'جارٍ الحفظ…',
        'discard' => 'تجاهل التغييرات',
        'unsaved' => 'لديك تغييرات غير محفوظة على الترتيب.',
        'save_failed' => 'تعذر حفظ الترتيب.',
        'empty' => 'لا توجد سجلات بعد',
        'moved' => 'تم نقل :title إلى الموضع :position من :count، المستوى :level.',
    ],

];
