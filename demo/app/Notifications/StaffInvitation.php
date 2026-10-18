<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Enums\StaffRole;
use App\Models\Store;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * The email a colleague receives when invited from the Staff resource. The demo's mail
 * driver is `log`, so the message lands in storage/logs/laravel.log instead of an inbox.
 */
class StaffInvitation extends Notification
{
    use Queueable;

    public function __construct(
        public readonly Store $store,
        public readonly User $inviter,
        public readonly StaffRole $role,
        public readonly string $temporaryPassword,
        public readonly string $panelUrl,
    ) {}

    /** @return array<int, string> */
    public function via(User $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(User $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(__('platform.staff.mail.subject', ['store' => $this->store->name]))
            ->greeting(__('platform.staff.mail.greeting', ['name' => $notifiable->name]))
            ->line(__('platform.staff.mail.intro', [
                'inviter' => $this->inviter->name,
                'store' => $this->store->name,
                'role' => $this->role->getLabel(),
            ]))
            ->line(__('platform.staff.mail.password', ['password' => $this->temporaryPassword]))
            ->action(__('platform.staff.mail.action'), $this->panelUrl)
            ->line(__('platform.staff.mail.outro'));
    }
}
