<?php

declare(strict_types=1);

/*
 * Turkish strings of the first-party plugin integration. Keys match lang/en/plugins.php.
 */
return [
    'commands' => [
        'group' => 'Maison Alfa',
        'order_board' => 'Sipariş panosunu aç',
        'calendar' => 'Mağaza takvimini aç',
        'returns' => 'İadeleri incele',
        'category_tree' => 'Kategori ağacını düzenle',
        'new_product' => 'Ürün ekle',
        'storefront' => 'Mağaza sitesini aç',
    ],

    'board' => [
        'title' => 'Sipariş panosu',
        'subheading' => 'Siparişleri hazırlama akışı boyunca sürükleyin veya klavyeyle taşıyın (Boşluk, oklar, Boşluk). Son 60 gün.',
        'open' => 'Pano',
        'timeline_note' => ':user tarafından sipariş panosunda taşındı',
    ],

    'calendar' => [
        'title' => 'Takvim',
        'subheading' => 'Bu mağazanın kampanyaları, gönderileri, teslimatları ve zamanlanmış sayfaları.',
        'this_week' => 'Bu hafta',
        'new_promotion' => 'Kampanya planla',
        'hint' => 'Bir kampanyayı taşımak için sürükleyin, süresini değiştirmek için bitişini sürükleyin, düzenlemek için tıklayın, yenisini planlamak için günleri seçin.',
        'fields' => [
            'value' => 'Değer (% veya tutar)',
        ],
        'legend' => [
            'label' => 'Açıklama',
            'percentage' => 'Kampanya: yüzde indirim',
            'fixed' => 'Kampanya: tutar indirimi',
            'free_shipping' => 'Kampanya: ücretsiz kargo',
            'shipped' => 'Gönderi butikten çıktı',
            'delivered' => 'Teslim edildi',
            'publish' => 'Zamanlanmış sayfa',
        ],
        'events' => [
            'shipped' => ':number kargoya verildi (:carrier)',
            'delivered' => ':number teslim edildi',
            'publish' => 'Yayımla: :title',
        ],
    ],

    'returns' => [
        'label' => 'iade',
        'plural' => 'İadeler',
        'workflow' => 'İade onayı',
        'subheading' => 'Destek ekibi bir siparişten iade açıp gönderir; bir sahip veya yönetici Onaylar bölümünden onaylar; onaylanan iadelerin ücreti geri ödenir.',
        'empty' => 'Henüz iade yok',
        'request' => 'İade talep et',
        'request_heading' => ':number numaralı sipariş için iade',
        'created' => ':number numaralı iade açıldı. Tamamlandığında onaya gönderin.',
        'timeline_note' => ':number numaralı iade ile geri ödendi',
        'states' => [
            'requested' => 'Talep edildi',
            'awaiting_approval' => 'Onay bekliyor',
            'approved' => 'Onaylandı',
            'rejected' => 'Reddedildi',
            'refunded' => 'Geri ödendi',
            'closed' => 'Kapatıldı',
        ],
        'transitions' => [
            'submit' => 'Onaya gönder',
            'refund' => 'Geri öde',
            'reopen' => 'Yeniden aç',
            'close' => 'Kapat',
        ],
        'steps' => [
            'manager' => 'Yönetici onayı',
        ],
        'reasons' => [
            'damaged' => 'Taşıma sırasında hasar gördü',
            'wrong_item' => 'Yanlış ürün',
            'not_as_described' => 'Açıklandığı gibi değil',
            'allergy' => 'Cilt reaksiyonu',
            'changed_mind' => 'Fikrimi değiştirdim',
        ],
        'fields' => [
            'number' => 'İade',
            'state' => 'Durum',
            'reason' => 'Neden',
            'amount' => 'İade tutarı',
            'details' => 'Ayrıntılar',
            'requested_by' => 'Açan',
            'refund_reference' => 'Geri ödeme referansı',
        ],
        'sections' => [
            'workflow' => 'İş akışı',
            'history' => 'Geçmiş',
            'details' => 'İade',
        ],
    ],

    'invoices' => [
        'issue' => 'Fatura kes',
        'open' => 'Faturayı aç',
        'issue_description' => 'Mağazanın vergi oranlarına göre KDV içeren, sipariş kalemlerinden bir fatura oluşturur.',
        'notes' => ':number numaralı siparişin faturası. Maison Alfa’yı tercih ettiğiniz için teşekkür ederiz.',
        'terms' => 'Ödeme 14 gün içinde yapılmalıdır. AlfaKit demosunun örnek belgesidir.',
    ],

    'comments' => [
        'section' => 'Dahili yorumlar',
        'section_description' => 'Yalnızca personel görür. Bir iş arkadaşınızdan bahsetmek için @ yazın; zil simgesinden bildirim alır.',
    ],

    'activity' => [
        'section' => 'Denetim kaydı',
    ],

    'helpdesk' => [
        'greeting' => 'Merhaba! Kokularımız veya siparişiniz hakkında bize her şeyi sorabilirsiniz.',
    ],

    'tree' => [
        'title' => 'Kategori ağacı',
        'subheading' => 'Kategorileri iç içe yerleştirmek veya yeniden sıralamak için sürükleyin (ya da ok düğmelerini kullanın), ardından kaydedin. Kategoriler tüm mağazalarda ortaktır.',
        'open' => 'Ağaç görünümü',
    ],

    'tags' => [
        'segments' => 'Segmentler',
    ],

    'media' => [
        'gallery' => 'Yaşam tarzı galerisi',
        'gallery_description' => 'Medya kütüphanesinde saklanan ek görseller (yukarıdaki ürün görsellerinden ayrı).',
    ],

    'views' => [
        'low_stock' => 'Düşük stok',
        'featured' => 'Öne çıkanlar',
        'drafts' => 'Taslaklar',
    ],

    'ai' => [
        'summarise_reviews' => 'Yorumları özetle',
        'summarise_heading' => 'Müşteriler :name hakkında ne diyor',
        'summarise_prompt' => '":name" parfümüne ait bu müşteri yorumlarını üç kısa madde halinde özetle: neyi sevdikleri, neyi eleştirdikleri ve kime uygun olduğu.',
    ],

    'settings' => [
        'title' => 'Maison ayarları',
        'subheading' => 'Maison Alfa’nın tüm mağazalarında ortaktır. Mağaza sitesi duyuruyu gösterir.',
        'sections' => [
            'brand' => 'Maison ve mağaza sitesi',
            'notifications' => 'Bildirimler',
        ],
        'fields' => [
            'house_name' => 'Maison adı',
            'announcement' => 'Mağaza sitesi duyurusu',
            'announcement_help' => 'Her mağaza sayfasının üstünde gösterilir. Gizlemek için boş bırakın.',
            'support_hours' => 'Destek saatleri',
            'price_display' => 'Mağaza sitesindeki fiyatlar',
            'low_stock_alerts' => 'Düşük stok uyarıları',
            'weekly_report' => 'Haftalık satış raporu',
            'report_recipients' => 'Rapor alıcıları',
            'report_recipients_help' => 'E-posta adresleri (demo e-postaları yalnızca günlüğe yazar).',
        ],
        'price_display' => [
            'tax_inclusive' => 'KDV dahil',
            'tax_exclusive' => 'KDV hariç',
        ],
    ],

    'backups' => [
        'read_only' => 'Herkese açık demoda salt okunur: yedek oluşturma, indirme ve silme kapalıdır. Demo veritabanı her saat yeniden oluşturulur.',
    ],

    'billing' => [
        'compare_plans' => 'Planları karşılaştır',
        'compare_plans_body' => 'Billing eklentisinin planlar sayfası her planı özellikleriyle listeler. Demoda hiçbir zaman ödeme alınmaz.',
        'see_plans' => 'Planları gör',
        'checkout_disabled' => 'Herkese açık demoda ödeme kapalıdır',
        'checkout_disabled_body' => ':plan planını seçtiniz. Gerçek bir mağaza şimdi Stripe Checkout’u açardı; demo hiçbir ödeme sağlayıcısıyla iletişime geçmez.',
        'contact' => 'Bizimle konuşun',
        'plans' => [
            'boutique' => 'Bir butik ve çevrimiçi mağazası.',
            'maison' => 'Ortak katalog ve raporlarla birden fazla butik.',
            'enterprise' => 'Franchise’lar, özel entegrasyonlar ve SSO.',
        ],
        'features' => [
            'boutique' => ['1 mağaza', '5 personel hesabı', 'E-posta desteği'],
            'maison' => ['Sınırsız mağaza', 'Sınırsız personel', 'Yardım masası ve analiz', 'Öncelikli destek'],
            'enterprise' => ['Özel başarı yöneticisi', 'Özel entegrasyonlar', 'Tek oturum açma'],
        ],
    ],

    'storefront' => [
        'pages' => 'Hakkımızda',
        'wholesale' => 'Toptan satış',
        'support' => 'Destek',
        'chat' => 'Bizimle sohbet edin',
        'wholesale_title' => 'Toptan satış talepleri',
        'wholesale_intro' => 'Oteller, spalar, konsept mağazalar ve kurumsal hediyeler: bu form panelde Forms eklentisiyle oluşturulur (iki adım, koşullu bir soru, spam koruması).',
        'wholesale_unavailable' => 'Toptan satış talepleri şimdilik durduruldu.',
        'support_title' => 'Müşteri hizmetleri',
        'support_intro' => 'Helpdesk eklentisinin müşteri portalı: talep açın, yazışmayı takip edin, yanıtı değerlendirin.',
        'new_checkout' => 'Yeni ödeme (beta)',
        'cms_intro' => 'Bu sayfa CMS eklentisiyle yönetilir: bloklar, taslaklar, canlı önizleme ve oturum açmış personel için bir düzenleme çubuğu.',
    ],
];
