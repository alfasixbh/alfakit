<?php

declare(strict_types=1);

namespace App\Enums;

use AlfaSix\Alfakit\Support\Contracts\HasColor;
use AlfaSix\Alfakit\Support\Contracts\HasIcon;
use AlfaSix\Alfakit\Support\Contracts\HasLabel;

enum ProductStatus: string implements HasColor, HasIcon, HasLabel
{
    case Draft = 'draft';
    case Active = 'active';
    case Archived = 'archived';

    public function getLabel(): string
    {
        return __('demo.product_status.'.$this->value);
    }

    public function getColor(): string
    {
        return match ($this) {
            self::Draft => 'gray',
            self::Active => 'success',
            self::Archived => 'warning',
        };
    }

    public function getIcon(): string
    {
        return match ($this) {
            self::Draft => 'pencil',
            self::Active => 'circle-check',
            self::Archived => 'archive',
        };
    }

    /** @return array<string, string> */
    public static function options(): array
    {
        return collect(self::cases())->mapWithKeys(fn (self $case): array => [$case->value => $case->getLabel()])->all();
    }
}
