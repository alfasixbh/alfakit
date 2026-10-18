<?php

declare(strict_types=1);

return [
    'sent' => ':email adresine bir bağlantı gönderdik. Bağlantıyı açtığınızda e-posta adresiniz değişir.',
    'pending_heading' => 'E-posta değişikliği bekliyor',
    'pending' => 'Yeni adresinizi onaylamak için :email adresine gönderdiğimiz bağlantıyı açın.',
    'cancel' => 'Değişikliği iptal et',
    'cancelled' => 'E-posta değişikliği iptal edildi.',
    'verified' => 'E-posta adresiniz değiştirildi.',
    'blocked' => 'E-posta değişikliği iptal edildi.',
    'invalid' => 'Bu bağlantı artık geçerli değil.',
    'verify_mail' => [
        'subject' => 'Yeni e-posta adresinizi onaylayın',
        'intro' => 'Bu adresi hesabınız için kullanmak üzere aşağıdaki düğmeye tıklayın.',
        'action' => 'E-posta adresini onayla',
        'expiry' => '{1} Bağlantının süresi :minutes dakika içinde dolar.|[2,*] Bağlantının süresi :minutes dakika içinde dolar.',
        'ignore' => 'Bu değişikliği siz istemediyseniz bu e-postayı yok sayabilirsiniz.',
    ],
    'notice_mail' => [
        'subject' => 'E-posta değişikliği istendi',
        'intro' => 'Birisi hesabınızın e-posta adresini :email olarak değiştirmek istedi.',
        'no_action' => 'Bu sizseniz bir şey yapmanız gerekmez. Değilse değişikliği iptal edip parolanızı değiştirin.',
        'action' => 'Değişikliği iptal et',
    ],
];
