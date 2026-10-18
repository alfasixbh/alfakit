<?php

declare(strict_types=1);

/*
 * Turkish demo strings. Keys must match lang/en/demo.php (tests/Feature/TranslationParityTest.php).
 */
return [
    'brand' => 'Maison Alfa',
    'tagline' => 'Bahreyn’de seçilmiş parfüm ve yaşam tarzı ürünleri.',

    'navigation' => [
        'catalog' => 'Katalog',
        'sales' => 'Satışlar',
        'customers' => 'Müşteriler',
        'marketing' => 'Pazarlama',
        'reports' => 'Raporlar',
        'settings' => 'Ayarlar',
        'showcase' => 'Vitrin',
        'support' => 'Destek',
        'content' => 'İçerik',
        'system' => 'Sistem',
    ],

    'switcher' => [
        'label' => 'Oluşturucu',
        'react' => 'React',
        'vue' => 'Vue',
        'svelte' => 'Svelte',
        'current' => ':renderer (geçerli)',
    ],

    'design' => [
        'theme' => 'Tema',
        'mobile_preset' => 'Mobil ön ayar',
        'mobile_on' => 'Telefonlarda alt gezinme',
        'mobile_off' => 'Telefonlarda yan menü',
    ],

    'footer' => [
        'note' => 'AlfaKit demosu · her saat sıfırlanır',
        'docs' => 'Belgeler',
    ],

    'meta' => [
        'site' => 'AlfaKit demosu',
        'title' => 'Maison Alfa · AlfaKit demosu',
        'panel_title' => 'Maison Alfa yönetimi · AlfaKit demosu',
        'description' => 'AlfaKit ile oluşturulmuş kurgusal bir parfüm mağazası: React, Vue ve Svelte ile işlenen tek bir Laravel yönetim paneli tanımı. Ortak demo hesabıyla giriş yapın; her şey saatte bir sıfırlanır.',
    ],

    'reset' => [
        'in' => ':minutes dk içinde sıfırlanacak',
        'soon' => 'Bir dakikadan kısa sürede sıfırlanacak',
        'title' => 'Demo veritabanı ve yüklemeler her saat başı geri yüklenir.',
    ],

    'profile' => [
        'locked_heading' => 'Bu ortak demo hesabıdır',
        'locked_body' => 'Bir sonraki ziyaretçinin giriş yapabilmesi için e-posta adresi ve parola değişmez. Görünen adı yine de değiştirebilirsiniz.',
        'mfa_heading' => 'İki adımlı kimlik doğrulama',
        'mfa_body' => 'Ortak hesap için kurulum kapalıdır. Kimlik doğrulama uygulamasını ve e-posta kodlarını denemek için Ayarlar › Personel bölümünden bir iş arkadaşınızın yerine geçin.',
    ],

    'errors' => [
        'back_home' => 'Mağazaya dön',
        'open_admin' => 'Yönetim panelini aç',
        '403' => ['title' => 'Bu hesap için değil', 'body' => 'Bu mağazadaki rolünüz bu sayfayı kapsamıyor. Mağaza değiştirin ya da bir sahipten erişim isteyin.'],
        '404' => ['title' => 'Sayfa bulunamadı', 'body' => 'Sayfa taşınmış ya da kayıt saatlik sıfırlamada silinmiş olabilir.'],
        '419' => ['title' => 'Sayfanın süresi doldu', 'body' => 'Oturumunuz zaman aşımına uğradı. Sayfayı yenileyip tekrar deneyin.'],
        '429' => ['title' => 'Biraz yavaşlayın', 'body' => 'Kısa sürede çok fazla istek gönderildi. Biraz bekleyip tekrar deneyin.'],
        '500' => ['title' => 'Bir şeyler ters gitti', 'body' => 'Hata kaydedildi. Birazdan tekrar deneyin.'],
        '503' => ['title' => 'Birazdan döneceğiz', 'body' => 'Demo yenileniyor. Bir dakika içinde geri dönecek.'],
    ],

    'login' => [
        'about' => 'Maison Alfa, yönetim paneli AlfaKit ile oluşturulan ve React, Vue ya da Svelte ile işlenen kurgusal bir parfüm mağazasıdır.',
        'heading' => 'Demo hesabı',
        'hint' => ':email ve :password parolasıyla giriş yapın. Yaptığınız her değişiklik saatte bir sıfırlanır.',
        'fill' => 'Demo hesabını kullan',
    ],

    'storefront' => [
        'title' => 'Maison Alfa',
        'nav' => [
            'home' => 'Ana sayfa',
            'contact' => 'İletişim',
            'track' => 'Sipariş takibi',
            'admin' => 'Yönetim panelini aç',
        ],
        'hero' => [
            'eyebrow' => 'AlfaKit demo mağazası',
            'title' => 'Hikâyesi olan kokular, sağlam bir yazılım.',
            'body' => 'Maison Alfa, AlfaKit’in neler işleyebildiğini göstermek için var olan kurgusal bir parfüm evidir: tek bir Laravel uygulaması, tek bir yönetim paneli tanımı, üç ön yüz. Mağazayı gezin, ardından aynı paneli React, Vue veya Svelte ile açın.',
            'cta' => 'Yönetim panelini aç',
            'secondary' => 'Belgeleri okuyun',
        ],
        'featured' => 'Bu sezonun öne çıkanları',
        'from' => ':price’den başlayan',
        'notes' => 'Üst :top · Orta :heart · Alt :base',
        'by' => ':brand',
        'empty' => 'Henüz öne çıkan ürün yok. Mağazayı doldurmak için php artisan demo:reset komutunu çalıştırın.',
        'footer' => [
            'beta' => 'AlfaKit genel beta',
            'built' => 'Alfa Six tarafından AlfaKit ile oluşturuldu. Kurgusal mağaza, gerçek yazılım.',
            'renderer' => ':renderer ile işlendi',
        ],
    ],

    'product_status' => [
        'draft' => 'Taslak',
        'active' => 'Etkin',
        'archived' => 'Arşivlendi',
    ],
    'order_status' => [
        'pending' => 'Beklemede',
        'paid' => 'Ödendi',
        'processing' => 'Hazırlanıyor',
        'shipped' => 'Kargoya verildi',
        'delivered' => 'Teslim edildi',
        'cancelled' => 'İptal edildi',
        'refunded' => 'İade edildi',
    ],
    'payment_method' => [
        'card' => 'Kart',
        'apple_pay' => 'Apple Pay',
        'paypal' => 'PayPal',
        'bank_transfer' => 'Banka havalesi',
        'cash_on_delivery' => 'Kapıda ödeme',
    ],
    'payment_status' => [
        'pending' => 'Beklemede',
        'captured' => 'Tahsil edildi',
        'failed' => 'Başarısız',
        'refunded' => 'İade edildi',
    ],
    'shipment_status' => [
        'pending' => 'Beklemede',
        'in_transit' => 'Yolda',
        'delivered' => 'Teslim edildi',
        'returned' => 'İade edildi',
    ],
    'review_status' => [
        'pending' => 'Beklemede',
        'approved' => 'Onaylandı',
        'rejected' => 'Reddedildi',
    ],
    'discount_type' => [
        'percentage' => 'Yüzde',
        'fixed' => 'Sabit tutar',
        'free_shipping' => 'Ücretsiz kargo',
    ],
    'staff_role' => [
        'owner' => 'Sahip',
        'manager' => 'Yönetici',
        'staff' => 'Personel',
    ],
    'concentration' => [
        'extrait' => 'Extrait de parfum',
        'parfum' => 'Parfüm',
        'eau_de_parfum' => 'Eau de parfum',
        'eau_de_toilette' => 'Eau de toilette',
        'body_mist' => 'Vücut spreyi',
        'candle' => 'Kokulu mum',
        'diffuser' => 'Çubuklu oda kokusu',
    ],
    'audience' => [
        'unisex' => 'Uniseks',
        'women' => 'Kadın',
        'men' => 'Erkek',
    ],

    'timeline' => [
        'placed' => 'Sipariş verildi',
        'paid' => 'Ödeme tahsil edildi',
        'processing' => 'Toplandı ve paketlendi',
        'shipped' => ':carrier firmasına teslim edildi',
        'delivered' => 'Teslim edildi',
        'cancelled' => 'Müşteri tarafından iptal edildi',
        'refunded' => 'İade yapıldı',
    ],
];
