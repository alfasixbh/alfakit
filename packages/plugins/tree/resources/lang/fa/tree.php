<?php

declare(strict_types=1);

return [

    'notifications' => [
        'saved' => 'ترتیب ذخیره شد',
    ],

    'validation' => [
        'invalid' => 'درخت خوانده نشد.',
        'unknown_record' => 'یکی از رکوردهای درخت دیگر وجود ندارد. صفحه را دوباره بارگذاری کنید و دوباره تلاش کنید.',
        'duplicate_record' => 'یک رکورد بیش از یک بار در درخت آمده است.',
        'unknown_parent' => 'یکی از رکوردهای والد دیگر وجود ندارد. صفحه را دوباره بارگذاری کنید و دوباره تلاش کنید.',
        'cycle' => 'یک رکورد را نمی‌توان به درون خودش منتقل کرد.',
        'max_depth' => 'عمق درخت حداکثر می‌تواند :depth سطح باشد.',
    ],

    // Shared with the renderers as `tree.*` (see TreePlugin::register()).
    'ui' => [
        'label' => 'درخت',
        'expand_all' => 'باز کردن همه',
        'collapse_all' => 'جمع کردن همه',
        'expand' => 'باز کردن :title',
        'collapse' => 'جمع کردن :title',
        'move_up' => 'انتقال :title به بالا',
        'move_down' => 'انتقال :title به پایین',
        'indent' => 'انتقال :title به درون مورد بالایی',
        'outdent' => 'خارج کردن :title از والد آن',
        'save' => 'ذخیره ترتیب',
        'saving' => 'در حال ذخیره…',
        'discard' => 'نادیده گرفتن تغییرات',
        'unsaved' => 'تغییرات ذخیره‌نشده‌ای در ترتیب دارید.',
        'save_failed' => 'ترتیب ذخیره نشد.',
        'empty' => 'هنوز رکوردی وجود ندارد',
        'moved' => ':title به جایگاه :position از :count، سطح :level منتقل شد.',
    ],

];
