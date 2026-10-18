<?php

declare(strict_types=1);

namespace App\Features;

use AlfaSix\AlfakitFeatureFlags\Attributes\Description;
use App\Models\Store;
use Laravel\Pennant\Attributes\Name;

/** The "Wholesale" page and footer link of the storefront (an alfakit-forms form). */
#[Name('wholesale-enquiries')]
#[Description('The wholesale enquiry page of the storefront, built with the Forms plugin.')]
class WholesaleEnquiries
{
    public function resolve(?Store $store): bool
    {
        return true;
    }
}
