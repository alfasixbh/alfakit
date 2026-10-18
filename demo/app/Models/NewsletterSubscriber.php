<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A newsletter sign-up from the storefront footer.
 *
 * @property int $id
 * @property int|null $store_id
 * @property string $email
 * @property string $locale
 * @property string $source
 */
#[Fillable(['store_id', 'email', 'locale', 'source'])]
class NewsletterSubscriber extends Model
{
    /** @return BelongsTo<Store, $this> */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}
