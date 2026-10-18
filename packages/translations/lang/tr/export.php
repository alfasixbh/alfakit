<?php

declare(strict_types=1);

return [
    'label' => ':label dışa aktar',
    'bulk_label' => 'Seçilenleri dışa aktar',
    'modal' => [
        'heading' => ':label dışa aktar',
        'submit' => 'Dışa aktar',
        'columns' => 'Sütunlar',
        'description' => 'Dışa aktarma arka planda çalışır. Dosyalar hazır olduğunda bildirim alacaksınız.',
        'column_labels' => 'Sütun etiketleri',
    ],
    'notifications' => [
        'started' => [
            'title' => 'Dışa aktarma başladı',
            'body' => ':count satır dışa aktarılıyor. Dosyalar hazır olduğunda bildirim alacaksınız.',
        ],
        'completed' => [
            'title' => 'Dışa aktarma tamamlandı',
            'body' => '{0} Hiç satır dışa aktarılmadı.|[1,*] :count satır dışa aktarıldı.',
            'failed' => ':count satır başarısız oldu.',
            'download_csv' => '.csv indir',
            'download_xlsx' => '.xlsx indir',
        ],
        'max_rows' => [
            'title' => 'Çok fazla satır',
            'body' => 'Tek seferde en fazla :count satır dışa aktarabilirsiniz.',
        ],
    ],
];
