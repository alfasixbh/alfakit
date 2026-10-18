<?php

declare(strict_types=1);

return [
    'page' => [
        'title' => 'Yedekler',
        'navigation_label' => 'Yedekler',
    ],

    'table' => [
        'heading' => 'Yedekler',
        'columns' => [
            'name' => 'Yedek',
            'disk' => 'Disk',
            'date' => 'Tarih',
            'size' => 'Boyut',
        ],
        'filters' => [
            'disk' => 'Disk',
        ],
        'empty' => [
            'heading' => 'Henüz yedek yok',
            'description' => 'Burada görmek için bir yedek oluşturun.',
        ],
    ],

    'destinations' => [
        'heading' => 'Yedekleme hedefleri',
        'label' => ':disk üzerinde :name',
        'healthy' => 'Sağlıklı',
        'unhealthy' => 'Sorunlu',
        'unreachable' => 'Erişilemiyor',
        'summary' => '{0} Yedek yok · :size kullanılıyor|{1} :count yedek · :size kullanılıyor · en yeni :newest|[2,*] :count yedek · :size kullanılıyor · en yeni :newest',
    ],

    'actions' => [
        'create' => [
            'label' => 'Yedek oluştur',
            'modal_heading' => 'Yedek oluştur',
            'modal_description' => 'Yedekleme arka planda çalışır; tamamlandığında listede görünür.',
            'submit' => 'Yedek oluştur',
            'option' => 'Yedeklenecekler',
            'options' => [
                'all' => 'Veritabanı ve dosyalar',
                'only_db' => 'Yalnızca veritabanı',
                'only_files' => 'Yalnızca dosyalar',
            ],
            'notification' => 'Arka planda yeni bir yedek oluşturuluyor',
        ],
        'download' => [
            'label' => 'İndir',
        ],
        'delete' => [
            'label' => 'Sil',
            'modal_heading' => 'Yedeği sil',
            'modal_description' => ':name silinsin mi? Bu işlem geri alınamaz.',
            'submit' => 'Sil',
            'notification' => 'Yedek silindi',
        ],
    ],
];
