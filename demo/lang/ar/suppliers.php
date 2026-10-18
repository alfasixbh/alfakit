<?php

declare(strict_types=1);

return [
    'label' => 'مورّد',
    'plural' => 'الموردون',
    'navigation' => 'الموردون',
    'intro' => 'بيانات الموردين موجودة في واجهة برمجية خارجية (يقدمها العرض التجريبي على ‎/demo-api/suppliers) وليست في قاعدة البيانات. تتحقق الواجهة من البيانات بنفسها: جرّب اسمًا موجودًا مسبقًا.',
    'fields' => [
        'name' => 'الاسم',
        'email' => 'بريد الطلبات',
        'country' => 'الدولة',
        'category' => 'الفئة',
        'status' => 'الحالة',
        'lead_time_days' => 'مدة التوريد',
        'rating' => 'التقييم',
        'notes' => 'ملاحظات',
        'updated_at' => 'آخر تحديث',
    ],
    'sections' => [
        'supplier' => 'المورّد',
        'terms' => 'الشروط',
    ],
    'lead_time' => '{1} يوم واحد|{2} يومان|[3,10] :count أيام|[11,*] :count يومًا',
    'categories' => [
        'oud' => 'عود',
        'florals' => 'زهور',
        'resins' => 'راتنجات',
        'citrus' => 'حمضيات',
        'packaging' => 'تغليف',
    ],
    'statuses' => [
        'active' => 'نشط',
        'paused' => 'متوقف',
    ],
    'helper' => [
        'country' => 'رمز ISO من حرفين، مثل FR.',
    ],
];
