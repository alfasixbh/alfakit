<?php

declare(strict_types=1);

namespace App\Enums;

use AlfaSix\Alfakit\Support\Contracts\HasColor;
use AlfaSix\Alfakit\Support\Contracts\HasIcon;
use AlfaSix\Alfakit\Support\Contracts\HasLabel;

enum OrderStatus: string implements HasColor, HasIcon, HasLabel
{
    case Pending = 'pending';
    case Paid = 'paid';
    case Processing = 'processing';
    case Shipped = 'shipped';
    case Delivered = 'delivered';
    case Cancelled = 'cancelled';
    case Refunded = 'refunded';

    public function getLabel(): string
    {
        return __('demo.order_status.'.$this->value);
    }

    public function getColor(): string
    {
        return match ($this) {
            self::Pending => 'gray',
            self::Paid => 'info',
            self::Processing => 'info',
            self::Shipped => 'primary',
            self::Delivered => 'success',
            self::Cancelled => 'danger',
            self::Refunded => 'warning',
        };
    }

    public function getIcon(): string
    {
        return match ($this) {
            self::Pending => 'clock',
            self::Paid => 'credit-card',
            self::Processing => 'package',
            self::Shipped => 'truck',
            self::Delivered => 'circle-check',
            self::Cancelled => 'circle-x',
            self::Refunded => 'rotate-ccw',
        };
    }

    /** @return array<string, string> */
    public static function options(): array
    {
        return collect(self::cases())->mapWithKeys(fn (self $case): array => [$case->value => $case->getLabel()])->all();
    }
}
