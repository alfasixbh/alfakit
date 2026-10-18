<?php

declare(strict_types=1);

namespace App\Models;

use Spatie\Tags\Tag;

/**
 * Spatie tag stored in `spatie_tags`: the blog's own `tags` table belongs to App\Models\Tag
 * (Post::topics()). Used by the alfakit-tags plugin through config('tags.tag_model').
 */
class SpatieTag extends Tag
{
    protected $table = 'spatie_tags';

    /** The `taggables` pivot keeps Spatie's `tag_id` column. */
    public function getForeignKey(): string
    {
        return 'tag_id';
    }
}
