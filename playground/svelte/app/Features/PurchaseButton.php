<?php

declare(strict_types=1);

namespace App\Features;

use AlfaSix\AlfakitFeatureFlags\Attributes\Values;
use App\Models\User;
use Laravel\Pennant\Attributes\Name;

/**
 * A rich-value Pennant feature: the colour of the purchase button.
 */
#[Name('purchase-button')]
#[Values(['blue' => 'Blue button', 'green' => 'Green button', 'orange' => 'Orange button'])]
class PurchaseButton
{
    /** Read by alfasix/alfakit-feature-flags; a method (not the attribute) so it is translated. */
    public static function description(): string
    {
        return __('playground.features.purchase_button');
    }

    public function resolve(User $user): string
    {
        return 'blue';
    }
}
