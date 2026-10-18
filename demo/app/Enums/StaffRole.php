<?php

declare(strict_types=1);

namespace App\Enums;

use AlfaSix\Alfakit\Support\Contracts\HasColor;
use AlfaSix\Alfakit\Support\Contracts\HasIcon;
use AlfaSix\Alfakit\Support\Contracts\HasLabel;

enum StaffRole: string implements HasColor, HasIcon, HasLabel
{
    case Owner = 'owner';
    case Manager = 'manager';
    case Staff = 'staff';

    public function getLabel(): string
    {
        return __('demo.staff_role.'.$this->value);
    }

    public function getColor(): string
    {
        return match ($this) {
            self::Owner => 'primary',
            self::Manager => 'info',
            self::Staff => 'gray',
        };
    }

    public function getIcon(): string
    {
        return match ($this) {
            self::Owner => 'crown',
            self::Manager => 'briefcase',
            self::Staff => 'user',
        };
    }

    /** Owners outrank managers, managers outrank staff. */
    public function rank(): int
    {
        return match ($this) {
            self::Owner => 3,
            self::Manager => 2,
            self::Staff => 1,
        };
    }

    /** @return array<string, string> */
    public static function options(): array
    {
        return collect(self::cases())->mapWithKeys(fn (self $case): array => [$case->value => $case->getLabel()])->all();
    }
}
