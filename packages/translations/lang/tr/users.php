<?php

declare(strict_types=1);

return [
    'model_label' => 'kullanıcı',
    'plural_model_label' => 'kullanıcılar',
    'never' => 'Hiç',
    'sections' => [
        'account' => 'Hesap',
        'security' => 'Güvenlik',
    ],
    'fields' => [
        'name' => 'Ad',
        'email' => 'E-posta adresi',
        'password' => 'Parola',
        'password_help' => 'Mevcut parolayı korumak için boş bırakın.',
        'password_confirmation' => 'Parolayı onaylayın',
        'current_password' => 'Mevcut parola',
        'new_password' => 'Yeni parola',
        'password_change_required' => 'Yeni parola iste',
        'password_change_required_help' => 'Kullanıcı bir sonraki girişinde yeni bir parola seçmelidir.',
        'roles' => 'Roller',
        'status' => 'Durum',
        'ban_reason' => 'Neden',
        'created_at' => 'Oluşturuldu',
        'last_login_at' => 'Son giriş',
        'last_login_ip' => 'Son giriş IP adresi',
        'two_factor' => 'İki adımlı doğrulama',
    ],
    'status' => [
        'active' => 'Aktif',
        'invited' => 'Davet edildi',
        'suspended' => 'Askıya alındı',
        'banned' => 'Yasaklandı',
    ],
    'actions' => [
        'invite' => [
            'label' => 'Kullanıcı davet et',
            'heading' => 'Bir kullanıcı davet edin',
            'description' => 'Parolasını belirlemesi için bağlantı içeren bir e-posta alır.',
            'submit' => 'Davet gönder',
            'done' => 'Davet gönderildi',
        ],
        'resend_invitation' => [
            'label' => 'Daveti yeniden gönder',
            'done' => 'Davet yeniden gönderildi',
        ],
        'suspend' => [
            'label' => 'Askıya al',
            'description' => 'Kullanıcının oturumu kapatılır ve askıyı kaldırana kadar giriş yapamaz.',
            'done' => 'Kullanıcı askıya alındı',
        ],
        'unsuspend' => [
            'label' => 'Askıyı kaldır',
            'done' => 'Kullanıcı yeniden giriş yapabilir',
        ],
        'ban' => [
            'label' => 'Yasakla',
            'description' => 'Kullanıcının oturumu kapatılır ve panelden engellenir. Neden yalnızca yöneticilere gösterilir.',
            'done' => 'Kullanıcı yasaklandı',
        ],
        'unban' => [
            'label' => 'Yasağı kaldır',
            'done' => 'Yasak kaldırıldı',
        ],
        'require_password_change' => [
            'label' => 'Yeni parola iste',
            'description' => 'Kullanıcı paneli yeniden kullanmadan önce yeni bir parola seçmelidir.',
            'done' => 'Kullanıcıdan yeni bir parola istenecek',
        ],
        'reset_two_factor' => [
            'label' => 'İki adımlı doğrulamayı sıfırla',
            'description' => 'Tüm ikinci adımları ve kurtarma kodlarını kapatır. Kullanıcı parolasıyla giriş yapar ve yeniden kurabilir.',
            'done' => 'İki adımlı doğrulama sıfırlandı',
        ],
        'revoke_session' => [
            'label' => 'Bir oturumu kapat',
            'session' => 'Oturum',
            'done' => 'Oturum kapatıldı',
        ],
        'revoke_sessions' => [
            'label' => 'Her yerden çıkış yap',
            'description' => 'Bu kullanıcının tüm cihazlardaki oturumlarını sonlandırır.',
            'done' => 'Her yerden çıkış yapıldı',
        ],
    ],
    'blocked' => [
        'suspended' => 'Hesabınız askıya alındı. Bir yöneticiyle iletişime geçin.',
        'banned' => 'Hesabınız yasaklandı.',
    ],
    'invitation' => [
        'title' => 'Daveti kabul et',
        'heading' => ':app uygulamasına hoş geldiniz',
        'submit' => 'Parolayı belirle ve giriş yap',
        'accepted' => 'Hoş geldiniz! Parolanız belirlendi.',
        'invalid' => 'Bu davet bağlantısı geçersiz veya zaten kullanılmış.',
        'mail' => [
            'subject' => ':app uygulamasına davet edildiniz',
            'greeting' => 'Merhaba!',
            'intro' => ':app uygulamasına davet edildiniz. Hesabınızı etkinleştirmek için bir parola seçin.',
            'action' => 'Daveti kabul et',
            'expiry' => 'Bu bağlantının süresi :days gün içinde dolar.',
        ],
    ],
    'change_password' => [
        'title' => 'Yeni bir parola seçin',
        'heading' => 'Yeni bir parola seçin',
        'description' => 'Bir yönetici devam etmeden önce parolanızı değiştirmenizi istedi.',
        'submit' => 'Parolayı kaydet',
        'done' => 'Parolanız değiştirildi.',
    ],
    'sessions' => [
        'heading' => 'Oturumlar',
        'description' => 'Bu kullanıcının oturum açtığı tarayıcılar ve cihazlar.',
        'empty' => 'Etkin oturum yok',
        'device' => 'Cihaz',
        'ip_address' => 'IP adresi',
        'last_active' => 'Son etkinlik',
        'unknown_device' => 'Bilinmeyen cihaz',
    ],
];
