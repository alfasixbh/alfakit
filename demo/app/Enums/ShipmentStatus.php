<?php

declare(strict_types=1);

namespace App\Enums;

use AlfaSix\Alfakit\Support\Contracts\HasColor;
use AlfaSix\Alfakit\Support\Contracts\HasIcon;
use AlfaSix\Alfakit\Support\Contracts\HasLabel;

enum ShipmentStatus: string implements HasColor, HasIcon, HasLabel
{
    case Pending = 'pending';
    case InTransit = 'in_transit';
    case Delivered = 'delivered';
    case Returned = 'returned';

    public function getLabel(): string
    {
        return __('demo.shipment_status.'.$this->value);
    }

    public function getColor(): string
    {
        return match ($this) {
            self::Pending => 'gray',
            self::InTransit => 'info',
            self::Delivered => 'success',
            self::Returned => 'warning',
        };
    }

    public function getIcon(): string
    {
        return match ($this) {
            self::Pending => 'clock',
            self::InTransit => 'truck',
            self::Delivered => 'circle-check',
            self::Returned => 'undo-2',
        };
    }

    /** @return array<string, string> */
    public static function options(): array
    {
        return collect(self::cases())->mapWithKeys(fn (self $case): array => [$case->value => $case->getLabel()])->all();
    }
}
