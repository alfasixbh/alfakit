<?php

declare(strict_types=1);

namespace App\Features;

use AlfaSix\AlfakitFeatureFlags\Attributes\Description;
use App\Models\Store;
use Laravel\Pennant\Attributes\Name;

/**
 * A redesigned checkout that is still being rolled out: off by default, ready to turn on
 * for a store from the Feature flags page (the storefront shows a "new checkout" badge).
 */
#[Name('new-checkout')]
#[Description('The redesigned one-page checkout, being rolled out store by store.')]
class NewCheckout
{
    public function resolve(?Store $store): bool
    {
        return false;
    }
}
