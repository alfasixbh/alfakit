<?php

declare(strict_types=1);

/*
 * Suppliers (an ApiResource over the demo's fake supplier API). Keys match lang/en/suppliers.php.
 */
return [
    'label' => 'تأمین‌کننده',
    'plural' => 'تأمین‌کنندگان',
    'navigation' => 'تأمین‌کنندگان',
    'intro' => 'تأمین‌کنندگان در یک API خارجی قرار دارند (که دمو در /demo-api/suppliers ارائه می‌کند)، نه در پایگاه داده. API خودش اعتبارسنجی می‌کند: نامی را امتحان کنید که از قبل وجود دارد.',
    'fields' => [
        'name' => 'نام',
        'email' => 'ایمیل سفارش',
        'country' => 'کشور',
        'category' => 'دسته',
        'status' => 'وضعیت',
        'lead_time_days' => 'زمان تحویل',
        'rating' => 'امتیاز',
        'notes' => 'یادداشت‌ها',
        'updated_at' => 'به‌روزرسانی',
    ],
    'sections' => [
        'supplier' => 'تأمین‌کننده',
        'terms' => 'شرایط',
    ],
    'lead_time' => '{1} :count روز|[2,*] :count روز',
    'categories' => [
        'oud' => 'عود',
        'florals' => 'گل‌ها',
        'resins' => 'رزین‌ها',
        'citrus' => 'مرکبات',
        'packaging' => 'بسته‌بندی',
    ],
    'statuses' => [
        'active' => 'فعال',
        'paused' => 'متوقف',
    ],
    'helper' => [
        'country' => 'کد دوحرفی ISO، مثلاً FR.',
    ],
];
