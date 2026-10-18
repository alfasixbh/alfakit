<?php

declare(strict_types=1);

namespace App\Features;

use AlfaSix\AlfakitFeatureFlags\Attributes\Description;
use App\Models\Store;
use Laravel\Pennant\Attributes\Name;

/**
 * The helpdesk live chat bubble on the storefront (alfasix/alfakit-feature-flags). Scoped to
 * the store, so turning it off in the panel hides the bubble on that store's shop.
 */
#[Name('storefront-live-chat')]
#[Description('The live chat bubble on the storefront (helpdesk). Turn it off to hide it for this store.')]
class StorefrontLiveChat
{
    public function resolve(?Store $store): bool
    {
        return true;
    }
}
