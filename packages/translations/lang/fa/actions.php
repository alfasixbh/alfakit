<?php

declare(strict_types=1);

return [
    'modal' => [
        'confirmation' => 'آیا از انجام این کار اطمینان دارید؟',
        'confirm' => 'تأیید',
        'submit' => 'ارسال',
        'cancel' => 'انصراف',
        'close' => 'بستن',
    ],
    'create' => [
        'label' => ':label جدید',
        'modal' => [
            'heading' => 'ایجاد :label',
            'submit' => 'ایجاد',
        ],
        'notification' => 'ایجاد شد',
        'create_another' => 'ایجاد و ایجاد مورد دیگر',
    ],
    'edit' => [
        'label' => 'ویرایش',
        'modal' => [
            'heading' => 'ویرایش :label',
            'submit' => 'ذخیره',
        ],
        'notification' => 'ذخیره شد',
    ],
    'view' => [
        'label' => 'مشاهده',
        'modal' => [
            'heading' => 'مشاهده :label',
        ],
    ],
    'delete' => [
        'label' => 'حذف',
        'modal' => [
            'heading' => 'حذف :label',
            'submit' => 'حذف',
        ],
        'notification' => 'حذف شد',
        'bulk' => [
            'heading' => 'حذف رکوردهای انتخاب‌شده',
            'notification' => 'حذف شد',
        ],
    ],
    'restore' => [
        'label' => 'بازیابی',
        'modal' => [
            'heading' => 'بازیابی :label',
            'submit' => 'بازیابی',
        ],
        'notification' => 'بازیابی شد',
        'bulk' => [
            'heading' => 'بازیابی رکوردهای انتخاب‌شده',
            'notification' => 'بازیابی شد',
        ],
    ],
    'force_delete' => [
        'label' => 'حذف دائمی',
        'modal' => [
            'heading' => 'حذف دائمی :label',
            'description' => 'این کار قابل بازگشت نیست.',
            'submit' => 'حذف',
        ],
        'notification' => 'برای همیشه حذف شد',
        'bulk' => [
            'heading' => 'حذف دائمی رکوردهای انتخاب‌شده',
            'notification' => 'برای همیشه حذف شد',
        ],
    ],
    'replicate' => [
        'label' => 'تکثیر',
        'modal' => [
            'heading' => 'تکثیر :label',
            'submit' => 'تکثیر',
        ],
        'notification' => 'تکثیر شد',
    ],
    'attach' => [
        'label' => 'پیوست',
        'modal' => [
            'heading' => 'پیوست :label',
            'submit' => 'پیوست',
        ],
        'notification' => 'پیوست شد',
    ],
    'detach' => [
        'label' => 'جدا کردن',
        'modal' => [
            'heading' => 'جدا کردن :label',
            'submit' => 'جدا کردن',
        ],
        'notification' => 'جدا شد',
    ],
    'associate' => [
        'label' => 'مرتبط کردن',
        'modal' => [
            'heading' => 'مرتبط کردن :label',
            'submit' => 'مرتبط کردن',
        ],
        'notification' => 'مرتبط شد',
    ],
    'dissociate' => [
        'label' => 'لغو ارتباط',
        'modal' => [
            'heading' => 'لغو ارتباط :label',
            'submit' => 'لغو ارتباط',
        ],
        'notification' => 'ارتباط لغو شد',
    ],
    'detach_bulk' => [
        'heading' => 'جدا کردن رکوردهای انتخاب‌شده',
        'notification' => 'جدا شد',
    ],
    'dissociate_bulk' => [
        'heading' => 'لغو ارتباط رکوردهای انتخاب‌شده',
        'notification' => 'ارتباط لغو شد',
    ],
    'rate_limited' => [
        'title' => 'تلاش‌های بیش از حد',
        'body' => 'لطفاً :seconds ثانیه صبر کنید و دوباره تلاش کنید.|لطفاً :seconds ثانیه صبر کنید و دوباره تلاش کنید.',
    ],
    'password_confirmation' => [
        'incorrect' => 'رمز عبور نادرست است.',
        'throttled' => 'تلاش‌های بیش از حد. :seconds ثانیه دیگر دوباره تلاش کنید.',
    ],
    'bulk' => [
        'unauthorized_records' => ':count رکورد انتخاب‌شده رد شد زیرا اجازهٔ تغییر آن را ندارید.|:count رکورد انتخاب‌شده رد شدند زیرا اجازهٔ تغییر آن‌ها را ندارید.',
        'all_failed' => 'رکورد پردازش نشد.|هیچ‌یک از :count رکورد پردازش نشد.',
        'some_failed' => ':failure از :total رکورد پردازش نشد.|:failure از :total رکورد پردازش نشد.',
    ],
    'history' => [
        'label' => 'تاریخچه',
        'modal' => [
            'heading' => 'تاریخچه :label',
            'close' => 'بستن',
        ],
        'empty' => 'هنوز نسخه‌ای وجود ندارد.',
        'events' => [
            'created' => 'ایجاد شد',
            'updated' => 'به‌روزرسانی شد',
            'deleted' => 'حذف شد',
            'restored' => 'بازیابی شد',
            'reverted' => 'نسخه قبلی بازیابی شد',
        ],
        'restore' => [
            'label' => 'بازیابی این نسخه',
            'modal' => [
                'heading' => 'این نسخه بازیابی شود؟',
                'description' => 'فیلدهای ردیابی‌شده به مقادیر این نسخه برمی‌گردند. مقادیر فعلی در تاریخچه می‌مانند.',
                'submit' => 'بازیابی',
            ],
            'notification' => 'نسخه بازیابی شد',
        ],
    ],
    'undo' => [
        'done' => 'انجام شد',
        'notification' => 'واگرد شد',
        'expired' => 'دیگر امکان واگرد وجود ندارد.',
        'conflict' => 'رکورد از آن زمان تغییر کرده است، بنابراین واگرد ممکن نیست.',
        'unavailable' => 'امکان واگرد نیست، زیرا رکورد دیگر وجود ندارد.',
    ],
];
