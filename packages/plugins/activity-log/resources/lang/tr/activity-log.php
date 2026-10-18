<?php

declare(strict_types=1);

return [
    'resource' => [
        'label' => 'etkinlik',
        'plural_label' => 'etkinlikler',
        'navigation_label' => 'Etkinlik günlüğü',
    ],

    'relation_manager' => [
        'title' => 'Etkinlik',
    ],

    'fields' => [
        'log_name' => 'Günlük',
        'event' => 'Olay',
        'description' => 'Açıklama',
        'subject' => 'Konu',
        'subject_type' => 'Konu türü',
        'causer' => 'Gerçekleştiren',
        'created_at' => 'Tarih',
        'created_from' => 'Başlangıç',
        'created_until' => 'Bitiş',
        'changes' => 'Değişiklikler',
        'attribute' => 'Özellik',
        'old' => 'Eski değer',
        'new' => 'Yeni değer',
        'property' => 'Nitelik',
        'value' => 'Değer',
    ],

    'sections' => [
        'overview' => 'Genel bakış',
        'changes' => 'Değişiklikler',
        'properties' => 'Nitelikler',
    ],

    'filters' => [
        'created_from_indicator' => ':date tarihinden itibaren',
        'created_until_indicator' => ':date tarihine kadar',
    ],

    'events' => [
        'created' => 'Oluşturuldu',
        'updated' => 'Güncellendi',
        'deleted' => 'Silindi',
        'restored' => 'Geri yüklendi',
    ],

    'causer' => [
        'system' => 'Sistem',
    ],

    'timeline' => [
        'label' => 'Etkinlik',
        'empty' => 'Henüz etkinlik yok.',
        'entry' => ':event · :causer',
    ],

    'empty' => [
        'heading' => 'Henüz etkinlik yok',
        'description' => 'Kayıtlarınızdaki değişiklikler burada listelenecek.',
    ],
];
