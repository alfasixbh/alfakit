<?php

declare(strict_types=1);

namespace App\Alfakit\Forms\Components;

use AlfaSix\Alfakit\Forms\Components\Field;
use Closure;

/**
 * A custom field rendered by resources/js/alfakit/fields/SwatchPicker.* (auto-registered,
 * type `SwatchPicker`). Its props types come from `php artisan alfakit:types`.
 */
class SwatchPicker extends Field
{
    /** @var array<string, string>|Closure */
    protected array|Closure $swatches = [];

    /**
     * @param  array<string, string>|Closure  $swatches  Hex colour => label
     */
    public function swatches(array|Closure $swatches): static
    {
        $this->swatches = $swatches;

        return $this;
    }

    /**
     * @return array{swatches: list<array{value: string, label: string}>}
     */
    protected function getSchemaProps(): array
    {
        $swatches = (array) $this->evaluate($this->swatches);

        return [
            'swatches' => array_values(array_map(
                static fn (string $value, string $label): array => ['value' => $value, 'label' => $label],
                array_keys($swatches),
                $swatches,
            )),
        ];
    }

    /**
     * @return array<mixed>
     */
    protected function getTypeValidationRules(): array
    {
        return ['string', 'regex:/^#[0-9a-f]{6}$/i'];
    }
}
