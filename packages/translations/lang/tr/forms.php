<?php

declare(strict_types=1);

return [
    'select' => [
        'boolean' => [
            'true' => 'Evet',
            'false' => 'Hayır',
        ],
        'placeholder' => 'Bir seçenek seçin',
        'search_prompt' => 'Aramak için yazmaya başlayın…',
        'no_search_results' => 'Aramanızla eşleşen seçenek yok.',
        'loading' => 'Yükleniyor…',
    ],
    'key_value' => [
        'key' => 'Anahtar',
        'value' => 'Değer',
        'add' => 'Satır ekle',
        'delete' => 'Satırı sil',
        'reorder' => 'Yeniden sırala',
    ],
    'repeater' => [
        'cannot_add' => ':attribute alanına öğe eklenemez.',
        'cannot_delete' => ':attribute alanından öğe kaldırılamaz.',
        'cannot_reorder' => ':attribute alanındaki öğeler yeniden sıralanamaz.',
        'add' => ':label öğesine ekle',
        'delete' => 'Sil',
        'clone' => 'Çoğalt',
        'move_up' => 'Yukarı taşı',
        'move_down' => 'Aşağı taşı',
        'collapse' => 'Daralt',
        'expand' => 'Genişlet',
        'reorder' => 'Yeniden sırala',
        'collapse_all' => 'Tümünü daralt',
        'expand_all' => 'Tümünü genişlet',
    ],
    'wizard' => [
        'next' => 'İleri',
        'previous' => 'Geri',
        'submit' => 'Gönder',
    ],
    'file_upload' => [
        'drop' => 'Dosyaları sürükleyip bırakın veya',
        'browse' => 'göz atın',
        'uploading' => 'Yükleniyor…',
        'remove' => 'Kaldır',
        'download' => 'İndir',
        'too_large' => 'Bu dosya çok büyük.',
        'invalid_type' => 'Bu dosya türüne izin verilmiyor.',
        'too_small' => 'Bu dosya çok küçük.',
        'unavailable' => 'Bu yükleme artık kullanılamıyor. Dosyayı yeniden yükleyin.',
        'invalid_dimensions' => 'Görsel boyutlarına izin verilmiyor.',
        'invalid_aspect_ratio' => 'Görselin en boy oranına izin verilmiyor.',
        'chunk_failed' => 'Yükleme tamamlanmadı. Dosyayı yeniden yükleyin.',
        'types' => [
            'images' => 'Görseller',
            'videos' => 'Videolar',
            'audio' => 'Ses dosyaları',
            'text' => 'Metin dosyaları',
        ],
    ],
    'tags_input' => [
        'placeholder' => 'Etiket ekle…',
    ],
    'rich_editor' => [
        'link_prompt' => 'Bir URL girin',
        'insert_block' => ':block ekle',
        'edit_block' => ':block düzenle',
        'save_block' => 'Kaydet',
        'insert' => 'Ekle',
        'text_colors' => [
            'red' => 'Kırmızı',
            'orange' => 'Turuncu',
            'amber' => 'Kehribar',
            'green' => 'Yeşil',
            'teal' => 'Camgöbeği',
            'blue' => 'Mavi',
            'indigo' => 'Çivit',
            'purple' => 'Mor',
            'pink' => 'Pembe',
            'gray' => 'Gri',
        ],
    ],
    'actions' => [
        'save' => 'Değişiklikleri kaydet',
        'create' => 'Oluştur',
        'create_another' => 'Oluştur ve yenisini ekle',
        'cancel' => 'İptal',
        'saved' => 'Kaydedildi',
        'created' => 'Oluşturuldu',
    ],
    'builder' => [
        'add' => ':label öğesine ekle',
        'block_max_items' => ':block yalnızca bir kez kullanılabilir.|:block en fazla :count kez kullanılabilir.',
    ],
    'slider' => [
        'difference' => 'Değerler arasındaki fark :min ile :max arasında olmalıdır.',
    ],
    'modal_table_select' => [
        'heading' => ':label seçin',
        'select' => 'Seç',
    ],
    'translatable' => [
        'attribute' => ':attribute (:locale)',
        'editing_language' => 'Düzenleme dili',
    ],
    'morph_to_select' => [
        'type' => 'Tür',
    ],
    'icon_picker' => [
        'invalid' => 'Seçilen simge kullanılamıyor.',
    ],
];
