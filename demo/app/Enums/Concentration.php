<?php

declare(strict_types=1);

namespace App\Enums;

use AlfaSix\Alfakit\Support\Contracts\HasColor;
use AlfaSix\Alfakit\Support\Contracts\HasIcon;
use AlfaSix\Alfakit\Support\Contracts\HasLabel;

enum Concentration: string implements HasColor, HasIcon, HasLabel
{
    case Extrait = 'extrait';
    case Parfum = 'parfum';
    case EauDeParfum = 'eau_de_parfum';
    case EauDeToilette = 'eau_de_toilette';
    case BodyMist = 'body_mist';
    case Candle = 'candle';
    case Diffuser = 'diffuser';

    public function getLabel(): string
    {
        return __('demo.concentration.'.$this->value);
    }

    public function getColor(): string
    {
        return match ($this) {
            self::Extrait => 'primary',
            self::Parfum => 'primary',
            self::EauDeParfum => 'info',
            self::EauDeToilette => 'info',
            self::BodyMist => 'gray',
            self::Candle => 'warning',
            self::Diffuser => 'warning',
        };
    }

    public function getIcon(): string
    {
        return match ($this) {
            self::Extrait => 'gem',
            self::Parfum => 'sparkles',
            self::EauDeParfum => 'droplets',
            self::EauDeToilette => 'droplet',
            self::BodyMist => 'wind',
            self::Candle => 'flame',
            self::Diffuser => 'wind',
        };
    }

    /** @return array<string, string> */
    public static function options(): array
    {
        return collect(self::cases())->mapWithKeys(fn (self $case): array => [$case->value => $case->getLabel()])->all();
    }
}
