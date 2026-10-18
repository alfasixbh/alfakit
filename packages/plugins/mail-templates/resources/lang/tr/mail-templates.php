<?php

declare(strict_types=1);

return [
    'label' => 'e-posta şablonu',
    'plural_label' => 'e-posta şablonları',
    'navigation' => 'E-posta şablonları',
    'sections' => [
        'template' => 'E-posta',
        'template_description' => 'Bu sürümün e-postasını ve dilini seçin.',
        'content' => 'İçerik',
        'content_description' => 'E-postanın kendi konusunu veya içeriğini korumak için alanı boş bırakın.',
    ],
    'fields' => [
        'key' => 'E-posta',
        'locale' => 'Dil',
        'subject' => 'Konu',
        'subject_help' => 'Birleştirme etiketleri burada da çalışır, örneğin {{ name }}.',
        'body' => 'İçerik',
        'body_help' => 'Birleştirme etiketlerini araç çubuğundan ekleyin; e-posta gönderilirken gerçek değerlerle değiştirilir.',
        'merge_tags' => 'Bu e-postanın birleştirme etiketleri:',
        'status' => 'Durum',
        'updated_at' => 'Güncellendi',
    ],
    'statuses' => [
        'customized' => 'Özelleştirildi',
        'default' => 'Varsayılan',
    ],
    'empty' => [
        'heading' => 'Özelleştirilmiş e-posta yok',
        'description' => 'Bir dilde konusunu ve içeriğini değiştirmek için bir e-postayı özelleştirin.',
    ],
    'actions' => [
        'preview' => [
            'label' => 'Önizle',
            'close' => 'Kapat',
            'subject' => 'Konu:',
            'light' => 'Açık',
            'dark' => 'Koyu',
            'frame' => 'E-posta önizlemesi (:variant)',
            'error' => 'Bu e-posta önizlenemedi.',
        ],
        'send_test' => [
            'label' => 'Test gönder',
            'modal_heading' => 'Test e-postası gönderilsin mi?',
            'modal_description' => 'Kaydedilen sürüm örnek verilerle kendi adresinize, :email, gönderilir.',
            'submit' => 'Test gönder',
            'sent' => 'Test e-postası :email adresine gönderildi.',
            'no_email' => 'Hesabınızda testin gönderileceği bir e-posta adresi yok.',
        ],
        'reset' => [
            'label' => 'Varsayılana sıfırla',
            'modal_heading' => 'Varsayılan e-postaya dönülsün mü?',
            'modal_description' => 'E-posta kendi konusuna ve içeriğine döner. Önceki sürümler geçmişte kalır.',
            'submit' => 'Sıfırla',
            'done' => 'E-posta varsayılana döndü.',
        ],
    ],
    'test' => [
        'subject' => '[Test] :subject',
    ],
    'validation' => [
        'unique' => 'Bu e-postanın bu dilde zaten bir şablonu var.',
        'unknown_tags' => ':tags bu e-postanın birleştirme etiketi değil.|:tags bu e-postanın birleştirme etiketleri değil.',
    ],
];
