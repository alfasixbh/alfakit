<?php

declare(strict_types=1);

return [
    'select' => [
        'boolean' => [
            'true' => 'بله',
            'false' => 'خیر',
        ],
        'placeholder' => 'یک گزینه انتخاب کنید',
        'search_prompt' => 'برای جستجو شروع به تایپ کنید…',
        'no_search_results' => 'هیچ گزینه‌ای با جستجوی شما مطابقت ندارد.',
        'loading' => 'در حال بارگذاری…',
    ],
    'key_value' => [
        'key' => 'کلید',
        'value' => 'مقدار',
        'add' => 'افزودن ردیف',
        'delete' => 'حذف ردیف',
        'reorder' => 'تغییر ترتیب',
    ],
    'repeater' => [
        'cannot_add' => 'امکان افزودن مورد به :attribute وجود ندارد.',
        'cannot_delete' => 'امکان حذف مورد از :attribute وجود ندارد.',
        'cannot_reorder' => 'امکان تغییر ترتیب موارد :attribute وجود ندارد.',
        'add' => 'افزودن به :label',
        'delete' => 'حذف',
        'clone' => 'تکثیر',
        'move_up' => 'انتقال به بالا',
        'move_down' => 'انتقال به پایین',
        'collapse' => 'جمع کردن',
        'expand' => 'باز کردن',
        'reorder' => 'تغییر ترتیب',
        'collapse_all' => 'جمع کردن همه',
        'expand_all' => 'باز کردن همه',
    ],
    'wizard' => [
        'next' => 'بعدی',
        'previous' => 'قبلی',
        'submit' => 'ارسال',
    ],
    'file_upload' => [
        'drop' => 'فایل‌ها را بکشید و رها کنید یا',
        'browse' => 'انتخاب کنید',
        'uploading' => 'در حال بارگذاری…',
        'remove' => 'حذف',
        'download' => 'دانلود',
        'too_large' => 'حجم این فایل بیش از حد مجاز است.',
        'invalid_type' => 'این نوع فایل مجاز نیست.',
        'too_small' => 'حجم این فایل کمتر از حد مجاز است.',
        'unavailable' => 'این فایل بارگذاری‌شده دیگر در دسترس نیست. دوباره بارگذاری کنید.',
        'invalid_dimensions' => 'ابعاد تصویر مجاز نیست.',
        'invalid_aspect_ratio' => 'نسبت ابعاد تصویر مجاز نیست.',
        'chunk_failed' => 'بارگذاری ناقص است. فایل را دوباره بارگذاری کنید.',
        'types' => [
            'images' => 'تصاویر',
            'videos' => 'ویدیوها',
            'audio' => 'فایل‌های صوتی',
            'text' => 'فایل‌های متنی',
        ],
    ],
    'tags_input' => [
        'placeholder' => 'افزودن برچسب…',
    ],
    'rich_editor' => [
        'link_prompt' => 'یک URL وارد کنید',
        'insert_block' => 'درج :block',
        'edit_block' => 'ویرایش :block',
        'save_block' => 'ذخیره',
        'insert' => 'درج',
        'text_colors' => [
            'red' => 'قرمز',
            'orange' => 'نارنجی',
            'amber' => 'کهربایی',
            'green' => 'سبز',
            'teal' => 'سبزآبی',
            'blue' => 'آبی',
            'indigo' => 'نیلی',
            'purple' => 'بنفش',
            'pink' => 'صورتی',
            'gray' => 'خاکستری',
        ],
    ],
    'actions' => [
        'save' => 'ذخیره تغییرات',
        'create' => 'ایجاد',
        'create_another' => 'ایجاد و ایجاد مورد دیگر',
        'cancel' => 'انصراف',
        'saved' => 'ذخیره شد',
        'created' => 'ایجاد شد',
    ],
    'builder' => [
        'add' => 'افزودن به :label',
        'block_max_items' => ':block فقط یک بار قابل استفاده است.|:block حداکثر :count بار قابل استفاده است.',
    ],
    'slider' => [
        'difference' => 'فاصله‌ی مقادیر باید بین :min و :max باشد.',
    ],
    'modal_table_select' => [
        'heading' => 'انتخاب :label',
        'select' => 'انتخاب',
    ],
    'translatable' => [
        'attribute' => ':attribute (:locale)',
        'editing_language' => 'زبان ویرایش',
    ],
    'morph_to_select' => [
        'type' => 'نوع',
    ],
    'icon_picker' => [
        'invalid' => 'نماد انتخاب‌شده در دسترس نیست.',
    ],
];
