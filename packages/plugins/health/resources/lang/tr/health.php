<?php

declare(strict_types=1);

return [
    'page' => [
        'title' => 'Uygulama sağlığı',
        'navigation_label' => 'Sağlık',
        'last_ran' => 'Kontrol edildi: :time',
        'never_ran' => 'Kontroller henüz çalıştırılmadı.',
    ],

    'results' => [
        'details' => 'Ayrıntılar',
        'columns' => [
            'check' => 'Kontrol',
            'status' => 'Durum',
            'summary' => 'Özet',
            'message' => 'Mesaj',
            'meta' => 'Ayrıntılar',
        ],
        'empty' => [
            'heading' => 'Henüz sonuç yok',
            'description' => 'Sağlık kontrollerini çalıştırmak için yenileyin.',
        ],
    ],

    'statuses' => [
        'ok' => 'Tamam',
        'warning' => 'Uyarı',
        'failed' => 'Başarısız',
        'crashed' => 'Çöktü',
        'skipped' => 'Atlandı',
        'unknown' => 'Bilinmiyor',
    ],

    'actions' => [
        'refresh' => [
            'label' => 'Yenile',
            'notification' => 'Sağlık kontrolleri yenilendi',
        ],
    ],

    'checks' => [
        'backups' => 'Yedekler',
        'cache' => 'Önbellek',
        'cpu_load' => 'CPU yükü',
        'database' => 'Veritabanı',
        'database_connection_count' => 'Veritabanı bağlantıları',
        'database_size' => 'Veritabanı boyutu',
        'database_table_size' => 'Tablo boyutu',
        'debug_mode' => 'Hata ayıklama modu',
        'environment' => 'Ortam',
        'flare_error_occurrence_count' => 'Flare hataları',
        'horizon' => 'Horizon',
        'meilisearch' => 'Meilisearch',
        'optimized_app' => 'Optimize uygulama',
        'ping' => 'Ping',
        'queue' => 'Kuyruk',
        'redis' => 'Redis',
        'redis_memory_usage' => 'Redis bellek kullanımı',
        'schedule' => 'Zamanlayıcı',
        'security_advisories' => 'Güvenlik bildirimleri',
        'used_disk_space' => 'Kullanılan disk alanı',
    ],

    'widget' => [
        'label' => 'Uygulama sağlığı',
        'ok' => 'Tüm kontroller başarılı',
        'failing' => '{1} :count başarısız kontrol|[2,*] :count başarısız kontrol',
        'warnings' => '{1} :count uyarı|[2,*] :count uyarı',
        'never_ran' => 'Henüz kontrol edilmedi',
    ],
];
