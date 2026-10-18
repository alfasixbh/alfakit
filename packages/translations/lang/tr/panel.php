<?php

declare(strict_types=1);

return [
    'dashboard' => [
        'title' => 'Kontrol paneli',
        'customize' => [
            'span' => '{1} :count sütun|[2,*] :count sütun',
            'span_full' => 'Tam genişlik',
            'invalid' => 'Bu pano düzeni geçersiz.',
        ],
    ],
    'global_search' => [
        'placeholder' => 'Ara…',
        'no_results' => 'Sonuç bulunamadı.',
    ],
    'resources' => [
        'list' => 'Liste',
        'create' => [
            'title' => ':label oluştur',
            'breadcrumb' => 'Oluştur',
        ],
        'edit' => [
            'title' => ':label düzenle',
            'breadcrumb' => 'Düzenle',
        ],
        'view' => [
            'title' => ':label görüntüle',
            'breadcrumb' => 'Görüntüle',
        ],
        'api' => [
            'failed' => 'İstek başarısız oldu',
            'unreachable' => 'Veri kaynağına ulaşılamadı. Lütfen tekrar deneyin.',
            'error' => 'Veri kaynağı bir hatayla yanıt verdi (:status). Lütfen tekrar deneyin.',
            'invalid' => 'Veri kaynağı verileri reddetti.',
        ],
    ],
    'tenancy' => [
        'switch' => 'Takım değiştir',
        'register' => 'Yeni takım',
        'profile' => 'Takım ayarları',
    ],
    'errors' => [
        'default' => [
            'title' => 'Bir şeyler ters gitti',
            'body' => 'İstek tamamlanamadı. Lütfen tekrar deneyin.',
        ],
        403 => [
            'title' => 'Erişim reddedildi',
            'body' => 'Bunu yapma izniniz yok.',
        ],
        404 => [
            'title' => 'Bulunamadı',
            'body' => 'Aradığınız sayfa veya kayıt mevcut değil.',
        ],
    ],
    'command_palette' => [
        'placeholder' => 'Bir komut yazın veya arayın…',
        'create' => 'Yeni :label',
    ],
    'realtime' => [
        'conflict' => [
            'refused_title' => 'Kaydedilmedi: kayıt değiştirildi',
            'refused_body' => 'Siz açtıktan sonra başka biri bu kaydı kaydetti. Değişikliklerini inceleyin, ardından yeniden kaydedin veya kendinizinkini koruyun.',
            'yes' => 'Evet',
            'no' => 'Hayır',
        ],
    ],
    'themes' => [
        'neutral' => [
            'label' => 'Nötr',
            'description' => 'Klasik: kenar çubuğunun yanında içe yerleştirilmiş içerik, sade başlıklar ve kenarlıklı kartlar.',
        ],
        'alfakit' => [
            'label' => 'AlfaKit',
            'description' => 'AlfaKit markasının imza tasarımı: sıcak krem üzerinde Alfa Navy ve Fox Orange, Montserrat başlıklar ve Inter metin, hap biçimli gezinmeye sahip yüzen kenar çubuğu, her sayfada kahraman afişi, yükseltilmiş kartlar, dolgulu giriş alanları ve hap biçimli düğmeler.',
        ],
        'minimal' => [
            'label' => 'Minimal',
            'description' => 'Kenar çubuğu yok: gezinme üstte altı çizili sekmeler olarak yer alır. İnce çizgili düz yüzeyler, altı çizili giriş alanları, kare düğmeler, kompakt.',
        ],
        'soft' => [
            'label' => 'Yumuşak',
            'description' => 'İnce bir simge şeridi, büyük tırnaklı başlıklar, renklendirilmiş kenarlıksız kartlar, dolgulu yuvarlak giriş alanları ve çizgili tablolar.',
        ],
        'corporate' => [
            'label' => 'Kurumsal',
            'description' => 'Vurgu çubuklu gezinmeye sahip lacivert kenar çubuğu, tam genişlikte başlık bandı, kare kenarlıklı yüzeyler ve sık çizgili tablolar.',
        ],
        'filament' => [
            'label' => 'Filament tarzı',
            'description' => 'Gri zemin, saydam kenar çubuğu, halkalı beyaz kartlar, kehribar vurgular ve Inter; FilamentPHP gibi.',
        ],
    ],
    'pwa' => [
        'offline' => [
            'title' => 'Çevrimdışı',
            'heading' => 'Çevrimdışısınız',
            'body' => 'Bağlantınızı kontrol edin. Tekrar çevrimiçi olduğunuzda bu sayfa kendiliğinden yenilenir.',
            'retry' => 'Tekrar dene',
        ],
    ],
];
