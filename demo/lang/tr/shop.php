<?php

declare(strict_types=1);

/*
 * Turkish storefront strings. Keys match lang/en/shop.php (tests/Feature/ShopTranslationParityTest.php).
 */
return [
    'attributes' => [
        'name' => 'ad',
        'rating' => 'puan',
        'review' => 'yorum',
    ],

    'locale' => [
        'label' => 'Dil',
    ],

    'strip' => [
        'eyebrow' => 'AlfaKit ile oluşturuldu',
        'title' => 'Tek panel tanımı, üç ön yüz.',
        'body' => 'Burada gördüğünüz her şey aynı PHP şemasından işlenir. Oluşturucuyu değiştirin; sayfa aynı işaretleme, aynı stil ve aynı davranışla React, Vue veya Svelte’te yeniden yüklensin.',
        'cta' => 'Oluşturucuyu değiştir',
        'hint' => ':renderer derlemesini görüntülüyorsunuz.',
        'mascot_alt' => 'AlfaKit’in tilki maskotu',
    ],

    'newsletter' => [
        'heading' => 'Atölyeden mektuplar',
        'body' => 'Yeni bir koku geldiğinde kısa bir not; ayda en fazla iki kez.',
        'label' => 'E-posta adresi',
        'placeholder' => 'siz@example.com',
        'submit' => 'Abone ol',
        'duplicate' => 'Bu adres zaten listede.',
        'thanks' => [
            'title' => 'Listedesiniz',
            'body' => 'Maison Alfa’nın bir sonraki mektubu önce size ulaşacak.',
        ],
    ],

    'product' => [
        'back' => 'Tüm ürünler',
        'by' => ':brand',
        'sku' => 'Referans',
        'gallery' => 'Galeri',
        'image_of' => ':name, görünüm :index',
        'sizes' => 'Boyutlar',
        'choose_size' => 'Bir boyut seçin',
        'stock' => [
            'in' => 'Stokta',
            'low' => 'Yalnızca :count adet kaldı',
            'out' => 'Tükendi',
        ],
        'notes' => [
            'heading' => 'Kompozisyon',
            'top' => 'Üst notalar',
            'heart' => 'Orta notalar',
            'base' => 'Alt notalar',
        ],
        'details' => [
            'heading' => 'Ayrıntılar',
            'concentration' => 'Konsantrasyon',
            'audience' => 'Kimin için',
            'size' => 'Boyut',
            'category' => 'Kategori',
            'tags' => 'Etiketler',
        ],
        'enquire' => 'Bu koku hakkında soru sorun',
        'track' => 'Sipariş takibi',
        'reviews' => [
            'heading' => 'Yorumlar',
            'count' => '{0} Henüz yorum yok|{1} Bir yorum|[2,*] :count yorum',
            'average' => '5 üzerinden :average',
            'empty' => 'Henüz yorum yok. Nasıl kalıcı olduğunu ilk siz anlatın.',
            'verified' => 'Doğrulanmış satın alma',
            'guest' => 'Misafir',
            'write' => 'Yorum yazın',
            'write_help' => 'Yorumlar ekip tarafından okunur ve genellikle bir gün içinde yönetim panelinden yayımlanır.',
        ],
        'related' => 'Bunları da beğenebilirsiniz',
        'compare' => 'Önceki fiyat :price',
        'currency_note' => 'Fiyatlar ABD doları cinsindendir, vergiler dahildir.',
    ],

    'review' => [
        'fields' => [
            'rating' => 'Puanınız',
            'name' => 'Adınız',
            'email' => 'E-posta',
            'email_help' => 'Asla gösterilmez. Bu kokuyu bizden aldıysanız yorumunuz doğrulanmış satın alma olarak işaretlenir.',
            'title' => 'Başlık',
            'body' => 'Yorumunuz',
        ],
        'submit' => 'Yorumu gönder',
        'thanks' => [
            'title' => 'Teşekkürler, :name',
            'body' => 'Yorumunuz ekibe iletildi; yönetim panelinde onaylandığında görünecek.',
        ],
    ],

    'contact' => [
        'heading' => 'Maison’a yazın',
        'intro' => 'Bir sipariş hakkında soru, bulamadığınız bir koku, toptan satış ya da basın: Manama’daki ekip her mesajı okur ve iki iş günü içinde yanıtlar.',
        'form_heading' => 'Mesaj gönderin',
        'form_help' => 'Bu bağımsız bir AlfaKit formudur: doğrulama sunucuda çalışır, konu seçimi sipariş numarası alanını gösterir ve gönder düğmesi hız sınırlıdır.',
        'details' => [
            'heading' => 'Butik',
            'email' => 'E-posta',
            'phone' => 'Telefon',
            'hours' => 'Çalışma saatleri',
            'hours_value' => 'Cumartesiden perşembeye, 10:00–22:00',
            'address' => 'Bahrain Bay, Manama',
        ],
        'fields' => [
            'name' => 'Adınız',
            'email' => 'E-posta',
            'topic' => 'Konu',
            'order_number' => 'Sipariş numarası',
            'message' => 'Mesaj',
            'message_help' => 'En az 20 karakter. Hakkında yazdığınız kokuyu veya siparişi belirtin.',
        ],
        'topics' => [
            'order' => 'Bir sipariş',
            'product' => 'Bir ürün',
            'wholesale' => 'Toptan satış',
            'press' => 'Basın',
            'other' => 'Başka bir konu',
        ],
        'prefill' => ':product hakkında daha fazla bilgi almak istiyorum.',
        'submit' => 'Mesajı gönder',
        'mail_subject' => 'Maison Alfa iletişim: :topic',
        'thanks' => [
            'title' => 'Teşekkürler, :name',
            'body' => ':email adresine iki iş günü içinde yanıt vereceğiz.',
        ],
        'rate_limited' => 'Zaten birkaç mesaj gönderdiniz',
    ],

    'track' => [
        'heading' => 'Sipariş takibi',
        'intro' => 'Ödeme sırasında kullandığınız e-postayı ve onaydaki sipariş numarasını girin. O hesaptaki tüm siparişleri ve istediğiniz siparişin tüm yolculuğunu göreceksiniz.',
        'fields' => [
            'email' => 'Ödemede kullanılan e-posta',
            'number' => 'Sipariş numarası',
            'submit' => 'Siparişimi bul',
        ],
        'sample' => [
            'heading' => 'Gerçek bir siparişle deneyin',
            'body' => 'Bu bir demo mağaza; sorgulayabileceğiniz örnek bir sipariş burada:',
            'use' => 'Bu siparişi kullan',
        ],
        'not_found' => [
            'heading' => 'Bu sipariş bulunamadı',
            'body' => 'E-postayı ve sipariş numarasını kontrol edin ya da aşağıdaki örnek siparişi kullanın.',
        ],
        'orders' => [
            'heading' => 'Siparişleriniz',
            'description' => ':name tarafından verilen tüm siparişler. Zaman çizelgesini görmek için bir siparişe tıklayın.',
            'number' => 'Sipariş',
            'placed' => 'Verildi',
            'items' => 'Ürünler',
            'status' => 'Durum',
            'total' => 'Toplam',
            'search' => 'Sipariş numarasıyla ara',
        ],
        'timeline' => [
            'heading' => 'Sipariş :number',
            'description' => 'Ödemeden kapınıza kadar her adım.',
            'steps' => 'Zaman çizelgesi',
            'carrier' => 'Kargo firması',
            'tracking' => 'Takip numarası',
            'ship_to' => 'Teslimat adresi',
            'no_shipment' => 'Henüz kargoya verilmedi',
            'no_tracking' => 'Kargoya verildiğinde görünür',
        ],
        'components_note' => 'Sipariş tablosu ve zaman çizelgesi bağımsız AlfaKit bileşenleridir: mağaza düzeninde işlenen bir Table ve bir Infolist.',
    ],
];
