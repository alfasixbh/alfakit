<?php

declare(strict_types=1);

namespace App\Enums;

use AlfaSix\Alfakit\Support\Contracts\HasColor;
use AlfaSix\Alfakit\Support\Contracts\HasIcon;
use AlfaSix\Alfakit\Support\Contracts\HasLabel;

enum DiscountType: string implements HasColor, HasIcon, HasLabel
{
    case Percentage = 'percentage';
    case Fixed = 'fixed';
    case FreeShipping = 'free_shipping';

    public function getLabel(): string
    {
        return __('demo.discount_type.'.$this->value);
    }

    public function getColor(): string
    {
        return match ($this) {
            self::Percentage => 'primary',
            self::Fixed => 'info',
            self::FreeShipping => 'success',
        };
    }

    public function getIcon(): string
    {
        return match ($this) {
            self::Percentage => 'percent',
            self::Fixed => 'badge-dollar-sign',
            self::FreeShipping => 'truck',
        };
    }

    /** @return array<string, string> */
    public static function options(): array
    {
        return collect(self::cases())->mapWithKeys(fn (self $case): array => [$case->value => $case->getLabel()])->all();
    }
}
