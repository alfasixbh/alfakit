<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Editorial page of a store (about, shipping policy, journal). `content` holds Builder blocks.
 *
 * @property int $id
 * @property int $store_id
 * @property string $title
 * @property string $slug
 * @property string|null $excerpt
 * @property array<int, array{type: string, data: array<string, mixed>}>|null $content
 * @property bool $is_published
 * @property Carbon|null $published_at
 */
#[Fillable(['store_id', 'title', 'slug', 'excerpt', 'content', 'is_published', 'published_at'])]
class ContentPage extends Model
{
    /** @return BelongsTo<Store, $this> */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    protected function casts(): array
    {
        return ['content' => 'array', 'is_published' => 'boolean', 'published_at' => 'datetime'];
    }
}
