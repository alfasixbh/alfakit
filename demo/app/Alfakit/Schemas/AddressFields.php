<?php

declare(strict_types=1);

namespace App\Alfakit\Schemas;

use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Schemas\Fragment;
use App\Demo\Catalog;

/**
 * Postal address fields shared by the order wizard (JSON snapshots), the customer form
 * (`Section::relationship('defaultAddress')`) and the addresses page.
 *
 * `AddressFields::make()->statePath('shipping_address')` nests the state; `make(required: false)`
 * relaxes the rules for optional blocks such as a billing address.
 */
class AddressFields extends Fragment
{
    public function __construct(protected bool $required = true)
    {
        parent::__construct();
    }

    public function define(): array
    {
        return [
            TextInput::make('recipient')->label(__('sales.fields.recipient'))->required($this->required)->maxLength(120)->columnSpanFull(),
            TextInput::make('line1')->label(__('sales.fields.line1'))->required($this->required)->maxLength(160)->columnSpanFull(),
            TextInput::make('line2')->label(__('sales.fields.line2'))->maxLength(160)->columnSpanFull(),
            TextInput::make('city')->label(__('sales.fields.city'))->required($this->required)->maxLength(80),
            TextInput::make('state')->label(__('sales.fields.state'))->maxLength(80),
            TextInput::make('postal_code')->label(__('sales.fields.postal_code'))->maxLength(16),
            Select::make('country')->label(__('sales.fields.country'))->options(self::countries())->required($this->required)->native(false)->searchable(),
            TextInput::make('phone')->label(__('sales.fields.phone'))->tel()->maxLength(32)->columnSpanFull(),
        ];
    }

    /** The countries the shop ships to, named in the current language. */
    public static function countries(): array
    {
        $codes = array_keys(Catalog::CITIES);
        $locale = app()->getLocale();

        $names = array_map(fn (string $code): string => \Locale::getDisplayRegion('-'.$code, $locale) ?: $code, $codes);

        $options = array_combine($codes, $names);
        asort($options);

        return $options;
    }

    /** One-line rendering of a stored snapshot for tables and infolists. */
    public static function format(?array $address): ?string
    {
        if ($address === null || blank(data_get($address, 'line1'))) {
            return null;
        }

        return implode(', ', array_filter([
            $address['recipient'] ?? null,
            $address['line1'] ?? null,
            $address['line2'] ?? null,
            trim(($address['postal_code'] ?? '').' '.($address['city'] ?? '')),
            $address['state'] ?? null,
            isset($address['country']) ? (\Locale::getDisplayRegion('-'.$address['country'], app()->getLocale()) ?: $address['country']) : null,
        ]));
    }
}
