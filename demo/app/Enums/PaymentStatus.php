<?php

declare(strict_types=1);

namespace App\Enums;

use AlfaSix\Alfakit\Support\Contracts\HasColor;
use AlfaSix\Alfakit\Support\Contracts\HasIcon;
use AlfaSix\Alfakit\Support\Contracts\HasLabel;

enum PaymentStatus: string implements HasColor, HasIcon, HasLabel
{
    case Pending = 'pending';
    case Captured = 'captured';
    case Failed = 'failed';
    case Refunded = 'refunded';

    public function getLabel(): string
    {
        return __('demo.payment_status.'.$this->value);
    }

    public function getColor(): string
    {
        return match ($this) {
            self::Pending => 'gray',
            self::Captured => 'success',
            self::Failed => 'danger',
            self::Refunded => 'warning',
        };
    }

    public function getIcon(): string
    {
        return match ($this) {
            self::Pending => 'clock',
            self::Captured => 'circle-check',
            self::Failed => 'circle-x',
            self::Refunded => 'rotate-ccw',
        };
    }

    /** @return array<string, string> */
    public static function options(): array
    {
        return collect(self::cases())->mapWithKeys(fn (self $case): array => [$case->value => $case->getLabel()])->all();
    }
}
