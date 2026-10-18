<?php

declare(strict_types=1);

namespace App\Enums;

use AlfaSix\Alfakit\Support\Contracts\HasColor;
use AlfaSix\Alfakit\Support\Contracts\HasIcon;
use AlfaSix\Alfakit\Support\Contracts\HasLabel;

enum PaymentMethod: string implements HasColor, HasIcon, HasLabel
{
    case Card = 'card';
    case ApplePay = 'apple_pay';
    case Paypal = 'paypal';
    case BankTransfer = 'bank_transfer';
    case CashOnDelivery = 'cash_on_delivery';

    public function getLabel(): string
    {
        return __('demo.payment_method.'.$this->value);
    }

    public function getColor(): string
    {
        return match ($this) {
            self::Card => 'primary',
            self::ApplePay => 'gray',
            self::Paypal => 'info',
            self::BankTransfer => 'warning',
            self::CashOnDelivery => 'gray',
        };
    }

    public function getIcon(): string
    {
        return match ($this) {
            self::Card => 'credit-card',
            self::ApplePay => 'smartphone',
            self::Paypal => 'wallet',
            self::BankTransfer => 'landmark',
            self::CashOnDelivery => 'banknote',
        };
    }

    /** @return array<string, string> */
    public static function options(): array
    {
        return collect(self::cases())->mapWithKeys(fn (self $case): array => [$case->value => $case->getLabel()])->all();
    }
}
