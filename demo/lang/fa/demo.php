<?php

declare(strict_types=1);

/*
 * Persian demo strings. Keys must match lang/en/demo.php (tests/Feature/TranslationParityTest.php).
 */
return [
    'brand' => 'Maison Alfa',
    'tagline' => 'عطر و سبک زندگی، گزینش‌شده در بحرین.',

    'navigation' => [
        'catalog' => 'کاتالوگ',
        'sales' => 'فروش',
        'customers' => 'مشتریان',
        'marketing' => 'بازاریابی',
        'reports' => 'گزارش‌ها',
        'settings' => 'تنظیمات',
        'showcase' => 'ویترین',
        'support' => 'پشتیبانی',
        'content' => 'محتوا',
        'system' => 'سیستم',
    ],

    'switcher' => [
        'label' => 'رندرکننده',
        'react' => 'React',
        'vue' => 'Vue',
        'svelte' => 'Svelte',
        'current' => ':renderer (فعلی)',
    ],

    'design' => [
        'theme' => 'پوسته',
        'mobile_preset' => 'پیش‌تنظیم موبایل',
        'mobile_on' => 'ناوبری پایین در گوشی',
        'mobile_off' => 'منوی کشویی در گوشی',
    ],

    'footer' => [
        'note' => 'دموی AlfaKit · بازنشانی هر ساعت',
        'docs' => 'مستندات',
    ],

    'meta' => [
        'site' => 'دموی AlfaKit',
        'title' => 'Maison Alfa · دموی AlfaKit',
        'panel_title' => 'مدیریت Maison Alfa · دموی AlfaKit',
        'description' => 'یک عطرفروشی خیالی ساخته‌شده با AlfaKit: یک تعریف واحد از پنل مدیریت Laravel که با React، Vue و Svelte رندر می‌شود. با حساب دموی مشترک وارد شوید؛ همه‌چیز هر ساعت بازنشانی می‌شود.',
    ],

    'reset' => [
        'in' => 'بازنشانی تا :minutes دقیقه دیگر',
        'soon' => 'بازنشانی تا کمتر از یک دقیقه دیگر',
        'title' => 'پایگاه داده و فایل‌های بارگذاری‌شده دمو هر ساعت سرِ ساعت بازیابی می‌شوند.',
    ],

    'profile' => [
        'locked_heading' => 'این حساب دموی مشترک است',
        'locked_body' => 'نشانی ایمیل و رمز عبور آن تغییر نمی‌کند تا بازدیدکننده بعدی بتواند وارد شود. با این حال می‌توانید نام نمایشی را تغییر دهید.',
        'mfa_heading' => 'احراز هویت دومرحله‌ای',
        'mfa_body' => 'راه‌اندازی برای حساب مشترک غیرفعال است. از تنظیمات › کارکنان به جای یکی از همکاران وارد شوید تا برنامه احراز هویت و کدهای ایمیلی را امتحان کنید.',
    ],

    'errors' => [
        'back_home' => 'بازگشت به فروشگاه',
        'open_admin' => 'باز کردن پنل مدیریت',
        '403' => ['title' => 'برای این حساب نیست', 'body' => 'نقش شما در این فروشگاه شامل این صفحه نمی‌شود. فروشگاه را عوض کنید یا از یک مالک دسترسی بخواهید.'],
        '404' => ['title' => 'صفحه پیدا نشد', 'body' => 'ممکن است صفحه جابه‌جا شده باشد یا رکورد در بازنشانی ساعتی حذف شده باشد.'],
        '419' => ['title' => 'صفحه منقضی شد', 'body' => 'نشست شما به پایان رسید. صفحه را دوباره بارگذاری کنید و دوباره تلاش کنید.'],
        '429' => ['title' => 'کمی آهسته‌تر', 'body' => 'درخواست‌های زیادی در زمان کوتاه ارسال شد. لحظه‌ای صبر کنید و دوباره تلاش کنید.'],
        '500' => ['title' => 'مشکلی پیش آمد', 'body' => 'خطا ثبت شد. چند لحظه دیگر دوباره تلاش کنید.'],
        '503' => ['title' => 'به‌زودی برمی‌گردیم', 'body' => 'دمو در حال تازه‌سازی است. تا یک دقیقه دیگر برمی‌گردد.'],
    ],

    'login' => [
        'about' => 'Maison Alfa یک عطرفروشی خیالی است که پنل مدیریت آن با AlfaKit ساخته شده و با React، Vue یا Svelte رندر می‌شود.',
        'heading' => 'حساب دمو',
        'hint' => 'با :email و رمز عبور :password وارد شوید. هر تغییری که بدهید هر ساعت بازنشانی می‌شود.',
        'fill' => 'استفاده از حساب دمو',
    ],

    'storefront' => [
        'title' => 'Maison Alfa',
        'nav' => [
            'home' => 'خانه',
            'contact' => 'تماس',
            'track' => 'پیگیری سفارش',
            'admin' => 'باز کردن پنل مدیریت',
        ],
        'hero' => [
            'eyebrow' => 'فروشگاه دموی AlfaKit',
            'title' => 'رایحه‌هایی با داستان، نرم‌افزاری استوار.',
            'body' => 'Maison Alfa یک خانه عطر خیالی است که برای نمایش توانایی‌های AlfaKit ساخته شده: یک برنامه Laravel، یک تعریف پنل مدیریت، سه فرانت‌اند. در فروشگاه بگردید و سپس همان پنل را در React، Vue یا Svelte باز کنید.',
            'cta' => 'باز کردن پنل مدیریت',
            'secondary' => 'خواندن مستندات',
        ],
        'featured' => 'برگزیده‌های این فصل',
        'from' => 'از :price',
        'notes' => 'نت آغازین :top · نت میانی :heart · نت پایه :base',
        'by' => 'از :brand',
        'empty' => 'هنوز محصول برگزیده‌ای وجود ندارد. برای پر کردن فروشگاه php artisan demo:reset را اجرا کنید.',
        'footer' => [
            'beta' => 'نسخه بتای عمومی AlfaKit',
            'built' => 'ساخته‌شده با AlfaKit توسط Alfa Six. فروشگاه خیالی، نرم‌افزار واقعی.',
            'renderer' => 'رندرشده با :renderer',
        ],
    ],

    'product_status' => [
        'draft' => 'پیش‌نویس',
        'active' => 'فعال',
        'archived' => 'بایگانی‌شده',
    ],
    'order_status' => [
        'pending' => 'در انتظار',
        'paid' => 'پرداخت‌شده',
        'processing' => 'در حال پردازش',
        'shipped' => 'ارسال‌شده',
        'delivered' => 'تحویل‌شده',
        'cancelled' => 'لغوشده',
        'refunded' => 'بازپرداخت‌شده',
    ],
    'payment_method' => [
        'card' => 'کارت',
        'apple_pay' => 'Apple Pay',
        'paypal' => 'PayPal',
        'bank_transfer' => 'انتقال بانکی',
        'cash_on_delivery' => 'پرداخت در محل',
    ],
    'payment_status' => [
        'pending' => 'در انتظار',
        'captured' => 'دریافت‌شده',
        'failed' => 'ناموفق',
        'refunded' => 'بازپرداخت‌شده',
    ],
    'shipment_status' => [
        'pending' => 'در انتظار',
        'in_transit' => 'در راه',
        'delivered' => 'تحویل‌شده',
        'returned' => 'مرجوع‌شده',
    ],
    'review_status' => [
        'pending' => 'در انتظار',
        'approved' => 'تأییدشده',
        'rejected' => 'ردشده',
    ],
    'discount_type' => [
        'percentage' => 'درصدی',
        'fixed' => 'مبلغ ثابت',
        'free_shipping' => 'ارسال رایگان',
    ],
    'staff_role' => [
        'owner' => 'مالک',
        'manager' => 'مدیر',
        'staff' => 'کارمند',
    ],
    'concentration' => [
        'extrait' => 'اکستریت دو پرفیوم',
        'parfum' => 'پرفیوم',
        'eau_de_parfum' => 'ادو پرفیوم',
        'eau_de_toilette' => 'ادو تویلت',
        'body_mist' => 'بادی میست',
        'candle' => 'شمع معطر',
        'diffuser' => 'خوشبوکننده چوبی',
    ],
    'audience' => [
        'unisex' => 'یونیسکس',
        'women' => 'زنانه',
        'men' => 'مردانه',
    ],

    'timeline' => [
        'placed' => 'سفارش ثبت شد',
        'paid' => 'پرداخت دریافت شد',
        'processing' => 'جمع‌آوری و بسته‌بندی شد',
        'shipped' => 'تحویل :carrier شد',
        'delivered' => 'تحویل داده شد',
        'cancelled' => 'توسط مشتری لغو شد',
        'refunded' => 'وجه بازپرداخت شد',
    ],
];
