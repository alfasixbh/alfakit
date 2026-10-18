<?php

declare(strict_types=1);

return [
    'modal' => [
        'confirmation' => 'هل أنت متأكد من أنك تريد القيام بذلك؟',
        'confirm' => 'تأكيد',
        'submit' => 'إرسال',
        'cancel' => 'إلغاء',
        'close' => 'إغلاق',
    ],
    'create' => [
        'label' => 'إضافة :label',
        'modal' => [
            'heading' => 'إنشاء :label',
            'submit' => 'إنشاء',
        ],
        'notification' => 'تم الإنشاء',
        'create_another' => 'إنشاء وإضافة آخر',
    ],
    'edit' => [
        'label' => 'تعديل',
        'modal' => [
            'heading' => 'تعديل :label',
            'submit' => 'حفظ',
        ],
        'notification' => 'تم الحفظ',
    ],
    'view' => [
        'label' => 'عرض',
        'modal' => [
            'heading' => 'عرض :label',
        ],
    ],
    'delete' => [
        'label' => 'حذف',
        'modal' => [
            'heading' => 'حذف :label',
            'submit' => 'حذف',
        ],
        'notification' => 'تم الحذف',
        'bulk' => [
            'heading' => 'حذف السجلات المحددة',
            'notification' => 'تم الحذف',
        ],
    ],
    'restore' => [
        'label' => 'استعادة',
        'modal' => [
            'heading' => 'استعادة :label',
            'submit' => 'استعادة',
        ],
        'notification' => 'تمت الاستعادة',
        'bulk' => [
            'heading' => 'استعادة السجلات المحددة',
            'notification' => 'تمت الاستعادة',
        ],
    ],
    'force_delete' => [
        'label' => 'حذف نهائي',
        'modal' => [
            'heading' => 'حذف :label نهائيًا',
            'description' => 'لا يمكن التراجع عن هذا الإجراء.',
            'submit' => 'حذف',
        ],
        'notification' => 'تم الحذف نهائيًا',
        'bulk' => [
            'heading' => 'حذف السجلات المحددة نهائيًا',
            'notification' => 'تم الحذف نهائيًا',
        ],
    ],
    'replicate' => [
        'label' => 'تكرار',
        'modal' => [
            'heading' => 'تكرار :label',
            'submit' => 'تكرار',
        ],
        'notification' => 'تم التكرار',
    ],
    'attach' => [
        'label' => 'إرفاق',
        'modal' => [
            'heading' => 'إرفاق :label',
            'submit' => 'إرفاق',
        ],
        'notification' => 'تم الإرفاق',
    ],
    'detach' => [
        'label' => 'فصل',
        'modal' => [
            'heading' => 'فصل :label',
            'submit' => 'فصل',
        ],
        'notification' => 'تم الفصل',
    ],
    'associate' => [
        'label' => 'ربط',
        'modal' => [
            'heading' => 'ربط :label',
            'submit' => 'ربط',
        ],
        'notification' => 'تم الربط',
    ],
    'dissociate' => [
        'label' => 'إلغاء الربط',
        'modal' => [
            'heading' => 'إلغاء ربط :label',
            'submit' => 'إلغاء الربط',
        ],
        'notification' => 'تم إلغاء الربط',
    ],
    'detach_bulk' => [
        'heading' => 'فصل السجلات المحددة',
        'notification' => 'تم الفصل',
    ],
    'dissociate_bulk' => [
        'heading' => 'إلغاء ربط السجلات المحددة',
        'notification' => 'تم إلغاء الربط',
    ],
    'rate_limited' => [
        'title' => 'محاولات كثيرة جدًا',
        'body' => 'يرجى الانتظار :seconds ثانية قبل المحاولة مرة أخرى.|يرجى الانتظار :seconds ثانية قبل المحاولة مرة أخرى.',
    ],
    'password_confirmation' => [
        'incorrect' => 'كلمة المرور غير صحيحة.',
        'throttled' => 'محاولات كثيرة جدًا. حاول مرة أخرى بعد :seconds ثانية.',
    ],
    'bulk' => [
        'unauthorized_records' => 'تم تخطي :count سجل محدد لأنه غير مسموح لك بتعديله.|تم تخطي :count سجلات محددة لأنه غير مسموح لك بتعديلها.',
        'all_failed' => 'تعذرت معالجة السجل.|تعذرت معالجة جميع السجلات البالغ عددها :count.',
        'some_failed' => 'تعذرت معالجة :failure من أصل :total سجل.|تعذرت معالجة :failure من أصل :total سجلات.',
    ],
    'history' => [
        'label' => 'السجل',
        'modal' => [
            'heading' => 'سجل :label',
            'close' => 'إغلاق',
        ],
        'empty' => 'لا توجد إصدارات بعد.',
        'events' => [
            'created' => 'تم الإنشاء',
            'updated' => 'تم التحديث',
            'deleted' => 'تم الحذف',
            'restored' => 'تمت الاستعادة',
            'reverted' => 'تمت استعادة إصدار سابق',
        ],
        'restore' => [
            'label' => 'استعادة هذا الإصدار',
            'modal' => [
                'heading' => 'هل تريد استعادة هذا الإصدار؟',
                'description' => 'ستعود الحقول المتتبَّعة إلى قيمها في هذا الإصدار. تبقى القيم الحالية في السجل.',
                'submit' => 'استعادة',
            ],
            'notification' => 'تمت استعادة الإصدار',
        ],
    ],
    'undo' => [
        'done' => 'تم',
        'notification' => 'تم التراجع',
        'expired' => 'لم يعد بالإمكان التراجع عن هذا.',
        'conflict' => 'تم تغيير السجل منذ ذلك الحين، لذا لا يمكن التراجع.',
        'unavailable' => 'لم يعد بالإمكان التراجع لأن السجل لم يعد موجودًا.',
    ],
];
