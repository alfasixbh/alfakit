<?php

declare(strict_types=1);

return [

    'notifications' => [
        'saved' => 'Sıralama kaydedildi',
    ],

    // Node buttons: they name the node, like the move buttons.
    'actions' => [
        'view' => ':title görüntüle',
        'edit' => ':title düzenle',
        'delete' => ':title sil',
    ],

    'validation' => [
        'invalid' => 'Ağaç okunamadı.',
        'unknown_record' => 'Ağaçtaki bir kayıt artık mevcut değil. Sayfayı yeniden yükleyip tekrar deneyin.',
        'duplicate_record' => 'Bir kayıt ağaçta birden fazla kez yer alıyor.',
        'unknown_parent' => 'Bir üst kayıt artık mevcut değil. Sayfayı yeniden yükleyip tekrar deneyin.',
        'cycle' => 'Bir kayıt kendi içine taşınamaz.',
        'max_depth' => 'Ağaç en fazla :depth seviye derinliğinde olabilir.',
    ],

    // Shared with the renderers as `tree.*` (see TreePlugin::register()).
    'ui' => [
        'label' => 'Ağaç',
        'expand_all' => 'Tümünü genişlet',
        'collapse_all' => 'Tümünü daralt',
        'expand' => ':title öğesini genişlet',
        'collapse' => ':title öğesini daralt',
        'move_up' => ':title öğesini yukarı taşı',
        'move_down' => ':title öğesini aşağı taşı',
        'indent' => ':title öğesini üstteki öğenin içine taşı',
        'outdent' => ':title öğesini üst öğesinin dışına taşı',
        'save' => 'Sıralamayı kaydet',
        'saving' => 'Kaydediliyor…',
        'discard' => 'Değişiklikleri at',
        'unsaved' => 'Sıralamada kaydedilmemiş değişiklikleriniz var.',
        'save_failed' => 'Sıralama kaydedilemedi.',
        'empty' => 'Henüz kayıt yok',
        'moved' => ':title, :count içinden :position konumuna taşındı, seviye :level.',
    ],

];
