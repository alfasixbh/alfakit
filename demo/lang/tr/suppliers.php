<?php

declare(strict_types=1);

/*
 * Suppliers (an ApiResource over the demo's fake supplier API). Keys match lang/en/suppliers.php.
 */
return [
    'label' => 'tedarikçi',
    'plural' => 'tedarikçiler',
    'navigation' => 'Tedarikçiler',
    'intro' => 'Tedarikçiler veritabanında değil, harici bir API’de bulunur (demo tarafından /demo-api/suppliers adresinde sunulur). API kendi doğrulamasını yapar: zaten var olan bir ad deneyin.',
    'fields' => [
        'name' => 'Ad',
        'email' => 'Sipariş e-postası',
        'country' => 'Ülke',
        'category' => 'Kategori',
        'status' => 'Durum',
        'lead_time_days' => 'Teslim süresi',
        'rating' => 'Puan',
        'notes' => 'Notlar',
        'updated_at' => 'Güncellendi',
    ],
    'sections' => [
        'supplier' => 'Tedarikçi',
        'terms' => 'Koşullar',
    ],
    'lead_time' => '{1} :count gün|[2,*] :count gün',
    'categories' => [
        'oud' => 'Ud',
        'florals' => 'Çiçeksi',
        'resins' => 'Reçineler',
        'citrus' => 'Narenciye',
        'packaging' => 'Ambalaj',
    ],
    'statuses' => [
        'active' => 'Etkin',
        'paused' => 'Duraklatıldı',
    ],
    'helper' => [
        'country' => 'İki harfli ISO kodu, ör. FR.',
    ],
];
