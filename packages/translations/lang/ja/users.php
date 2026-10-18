<?php

declare(strict_types=1);

return [
    'model_label' => 'ユーザー',
    'plural_model_label' => 'ユーザー',
    'never' => 'なし',
    'sections' => [
        'account' => 'アカウント',
        'security' => 'セキュリティ',
    ],
    'fields' => [
        'name' => '名前',
        'email' => 'メールアドレス',
        'password' => 'パスワード',
        'password_help' => '現在のパスワードを維持する場合は空欄のままにしてください。',
        'password_confirmation' => 'パスワード（確認）',
        'current_password' => '現在のパスワード',
        'new_password' => '新しいパスワード',
        'password_change_required' => '新しいパスワードを要求',
        'password_change_required_help' => '次回のサインイン時に新しいパスワードの設定が必要になります。',
        'roles' => 'ロール',
        'status' => 'ステータス',
        'ban_reason' => '理由',
        'created_at' => '作成日',
        'last_login_at' => '最終サインイン',
        'last_login_ip' => '最終サインインの IP',
        'two_factor' => '二要素認証',
    ],
    'status' => [
        'active' => '有効',
        'invited' => '招待済み',
        'suspended' => '一時停止中',
        'banned' => '利用禁止',
    ],
    'actions' => [
        'invite' => [
            'label' => 'ユーザーを招待',
            'heading' => 'ユーザーを招待する',
            'description' => 'パスワードを設定するためのリンクがメールで届きます。',
            'submit' => '招待を送信',
            'done' => '招待を送信しました',
        ],
        'resend_invitation' => [
            'label' => '招待を再送信',
            'done' => '招待を再送信しました',
        ],
        'suspend' => [
            'label' => '一時停止',
            'description' => 'ユーザーはサインアウトされ、再開するまでサインインできません。',
            'done' => 'ユーザーを一時停止しました',
        ],
        'unsuspend' => [
            'label' => '再開',
            'done' => 'ユーザーは再びサインインできます',
        ],
        'ban' => [
            'label' => '利用禁止にする',
            'description' => 'ユーザーはサインアウトされ、パネルの利用が禁止されます。理由は管理者にのみ表示されます。',
            'done' => 'ユーザーを利用禁止にしました',
        ],
        'unban' => [
            'label' => '利用禁止を解除',
            'done' => '利用禁止を解除しました',
        ],
        'require_password_change' => [
            'label' => '新しいパスワードを要求',
            'description' => 'パネルを再び使う前に新しいパスワードの設定が必要になります。',
            'done' => 'ユーザーに新しいパスワードを求めます',
        ],
        'reset_two_factor' => [
            'label' => '二要素認証をリセット',
            'description' => 'すべての二要素と復旧コードを無効にします。ユーザーはパスワードでサインインし、再設定できます。',
            'done' => '二要素認証をリセットしました',
        ],
        'revoke_session' => [
            'label' => 'セッションをサインアウト',
            'session' => 'セッション',
            'done' => 'セッションをサインアウトしました',
        ],
        'revoke_sessions' => [
            'label' => 'すべての場所からサインアウト',
            'description' => 'このユーザーのすべてのデバイスのセッションを終了します。',
            'done' => 'すべての場所からサインアウトしました',
        ],
    ],
    'blocked' => [
        'suspended' => 'アカウントは一時停止されています。管理者に連絡してください。',
        'banned' => 'アカウントは利用禁止になっています。',
    ],
    'invitation' => [
        'title' => '招待を承諾',
        'heading' => ':app へようこそ',
        'submit' => 'パスワードを設定してサインイン',
        'accepted' => 'ようこそ！パスワードを設定しました。',
        'invalid' => 'この招待リンクは無効か、すでに使用されています。',
        'mail' => [
            'subject' => ':app に招待されました',
            'greeting' => 'こんにちは！',
            'intro' => ':app に招待されました。パスワードを設定してアカウントを有効にしてください。',
            'action' => '招待を承諾',
            'expiry' => 'このリンクの有効期限は :days 日です。',
        ],
    ],
    'change_password' => [
        'title' => '新しいパスワードを設定',
        'heading' => '新しいパスワードを設定',
        'description' => '続行する前にパスワードを変更するよう管理者から求められています。',
        'submit' => 'パスワードを保存',
        'done' => 'パスワードを変更しました。',
    ],
    'sessions' => [
        'heading' => 'セッション',
        'description' => 'このユーザーがサインインしているブラウザとデバイス。',
        'empty' => 'アクティブなセッションはありません',
        'device' => 'デバイス',
        'ip_address' => 'IP アドレス',
        'last_active' => '最終アクティブ',
        'unknown_device' => '不明なデバイス',
    ],
];
