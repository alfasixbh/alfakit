<?php

declare(strict_types=1);

return [
    'label' => 'درون‌ریزی :label',
    'column_number' => 'ستون :number',
    'modal' => [
        'heading' => 'درون‌ریزی :label',
        'max_rows' => 'فایل‌ها می‌توانند حداکثر :count ردیف داشته باشند.',
        'submit' => 'درون‌ریزی',
        'file' => 'فایل CSV',
        'columns' => 'ستون‌ها',
        'skip_column' => 'درون‌ریزی نشود',
        'example' => 'دانلود CSV نمونه',
    ],
    'validation' => [
        'max_rows' => 'فایل حداکثر می‌تواند :count ردیف داشته باشد.',
    ],
    'notifications' => [
        'started' => [
            'title' => 'درون‌ریزی آغاز شد',
            'body' => 'در حال درون‌ریزی :count ردیف. پس از پایان به شما اطلاع داده می‌شود.',
        ],
        'completed' => [
            'title' => 'درون‌ریزی کامل شد',
            'body' => '{0} هیچ ردیفی درون‌ریزی نشد.|[1,*] :count ردیف درون‌ریزی شد.',
            'failed' => ':count ردیف ناموفق بود.',
            'download_failed_rows' => 'دانلود ردیف‌های ناموفق',
        ],
    ],
    'failures' => [
        'record_not_found' => 'رکوردی که باید به‌روزرسانی شود پیدا نشد.',
        'relationship_not_found' => 'هیچ :attribute با «:value» مطابقت ندارد.',
        'unauthorized' => 'اجازهٔ به‌روزرسانی این رکورد را ندارید.',
        'unexpected' => 'درون‌ریزی این ردیف ممکن نبود.',
    ],
    'failed_rows' => [
        'error' => 'خطا',
    ],
];
