<?php

declare(strict_types=1);

return [
    'label' => ':label içe aktar',
    'column_number' => 'Sütun :number',
    'modal' => [
        'heading' => ':label içe aktar',
        'max_rows' => 'Dosyalar en fazla :count satır içerebilir.',
        'submit' => 'İçe aktar',
        'file' => 'CSV dosyası',
        'columns' => 'Sütunlar',
        'skip_column' => 'İçe aktarma',
        'example' => 'Örnek CSV indir',
    ],
    'validation' => [
        'max_rows' => 'Dosya en fazla :count satır içerebilir.',
    ],
    'notifications' => [
        'started' => [
            'title' => 'İçe aktarma başladı',
            'body' => ':count satır içe aktarılıyor. Bittiğinde bildirim alacaksınız.',
        ],
        'completed' => [
            'title' => 'İçe aktarma tamamlandı',
            'body' => '{0} Hiç satır içe aktarılmadı.|[1,*] :count satır içe aktarıldı.',
            'failed' => ':count satır başarısız oldu.',
            'download_failed_rows' => 'Başarısız satırları indir',
        ],
    ],
    'failures' => [
        'record_not_found' => 'Güncellenecek kayıt bulunamadı.',
        'relationship_not_found' => ':attribute için ":value" ile eşleşen kayıt yok.',
        'unauthorized' => 'Bu kaydı güncelleme yetkiniz yok.',
        'unexpected' => 'Satır içe aktarılamadı.',
    ],
    'failed_rows' => [
        'error' => 'Hata',
    ],
];
