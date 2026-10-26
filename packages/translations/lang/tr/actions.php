<?php

declare(strict_types=1);

return [
    'modal' => [
        'confirmation' => 'Bu işlemi yapmak istediğinizden emin misiniz?',
        'confirm' => 'Onayla',
        'submit' => 'Gönder',
        'cancel' => 'İptal',
        'close' => 'Kapat',
    ],
    'create' => [
        'label' => 'Yeni :label',
        'modal' => [
            'heading' => ':label oluştur',
            'submit' => 'Oluştur',
        ],
        'notification' => 'Oluşturuldu',
        'create_another' => 'Oluştur ve yenisini ekle',
    ],
    'edit' => [
        'label' => 'Düzenle',
        'modal' => [
            'heading' => ':label düzenle',
            'submit' => 'Kaydet',
        ],
        'notification' => 'Kaydedildi',
    ],
    'view' => [
        'label' => 'Görüntüle',
        'modal' => [
            'heading' => ':label görüntüle',
        ],
    ],
    'delete' => [
        'label' => 'Sil',
        'modal' => [
            'heading' => ':label sil',
            'submit' => 'Sil',
        ],
        'notification' => 'Silindi',
        'bulk' => [
            'heading' => 'Seçili kayıtları sil',
            'notification' => 'Silindi',
        ],
    ],
    'restore' => [
        'label' => 'Geri yükle',
        'modal' => [
            'heading' => ':label geri yükle',
            'submit' => 'Geri yükle',
        ],
        'notification' => 'Geri yüklendi',
        'bulk' => [
            'heading' => 'Seçili kayıtları geri yükle',
            'notification' => 'Geri yüklendi',
        ],
    ],
    'force_delete' => [
        'label' => 'Kalıcı olarak sil',
        'modal' => [
            'heading' => ':label kalıcı olarak sil',
            'description' => 'Bu işlem geri alınamaz.',
            'submit' => 'Sil',
        ],
        'notification' => 'Kalıcı olarak silindi',
        'bulk' => [
            'heading' => 'Seçili kayıtları kalıcı olarak sil',
            'notification' => 'Kalıcı olarak silindi',
        ],
    ],
    'replicate' => [
        'label' => 'Çoğalt',
        'modal' => [
            'heading' => ':label çoğalt',
            'submit' => 'Çoğalt',
        ],
        'notification' => 'Çoğaltıldı',
    ],
    'attach' => [
        'label' => 'Bağla',
        'modal' => [
            'heading' => ':label bağla',
            'submit' => 'Bağla',
        ],
        'notification' => 'Bağlandı',
    ],
    'detach' => [
        'label' => 'Bağlantıyı kaldır',
        'modal' => [
            'heading' => ':label bağlantısını kaldır',
            'submit' => 'Bağlantıyı kaldır',
        ],
        'notification' => 'Bağlantı kaldırıldı',
    ],
    'associate' => [
        'label' => 'İlişkilendir',
        'modal' => [
            'heading' => ':label ilişkilendir',
            'submit' => 'İlişkilendir',
        ],
        'notification' => 'İlişkilendirildi',
    ],
    'dissociate' => [
        'label' => 'İlişkiyi kaldır',
        'modal' => [
            'heading' => ':label ilişkisini kaldır',
            'submit' => 'İlişkiyi kaldır',
        ],
        'notification' => 'İlişki kaldırıldı',
    ],
    'detach_bulk' => [
        'heading' => 'Seçili kayıtları ayır',
        'notification' => 'Ayrıldı',
    ],
    'dissociate_bulk' => [
        'heading' => 'Seçili kayıtların ilişkisini kaldır',
        'notification' => 'İlişki kaldırıldı',
    ],
    'rate_limited' => [
        'title' => 'Çok fazla deneme',
        'body' => 'Tekrar denemeden önce lütfen :seconds saniye bekleyin.|Tekrar denemeden önce lütfen :seconds saniye bekleyin.',
    ],
    'password_confirmation' => [
        'incorrect' => 'Parola yanlış.',
        'throttled' => 'Çok fazla deneme. :seconds saniye sonra tekrar deneyin.',
    ],
    'bulk' => [
        'unauthorized_records' => 'Değiştirme izniniz olmadığı için :count seçili kayıt atlandı.|Değiştirme izniniz olmadığı için :count seçili kayıt atlandı.',
        'all_failed' => 'Kayıt işlenemedi.|:count kaydın hiçbiri işlenemedi.',
        'some_failed' => ':total kayıttan :failure tanesi işlenemedi.|:total kayıttan :failure tanesi işlenemedi.',
    ],
    'history' => [
        'label' => 'Geçmiş',
        'modal' => [
            'heading' => ':label geçmişi',
            'close' => 'Kapat',
        ],
        'empty' => 'Henüz sürüm yok.',
        'events' => [
            'created' => 'Oluşturuldu',
            'updated' => 'Güncellendi',
            'deleted' => 'Silindi',
            'restored' => 'Geri yüklendi',
            'reverted' => 'Önceki bir sürüm geri yüklendi',
            'baseline' => 'Geçmiş başlamadan önce',
        ],
        'restore' => [
            'label' => 'Bu sürümü geri yükle',
            'modal' => [
                'heading' => 'Bu sürüm geri yüklensin mi?',
                'description' => 'İzlenen alanlar bu sürümdeki değerlerine döner. Geçerli değerler geçmişte kalır.',
                'submit' => 'Geri yükle',
            ],
            'notification' => 'Sürüm geri yüklendi',
        ],
    ],
    'undo' => [
        'done' => 'Tamamlandı',
        'notification' => 'Geri alındı',
        'expired' => 'Bu artık geri alınamaz.',
        'conflict' => 'Kayıt o zamandan beri değişti, bu yüzden geri alınamaz.',
        'unavailable' => 'Kayıt artık olmadığı için geri alınamaz.',
    ],
];
