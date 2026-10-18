<?php

declare(strict_types=1);

namespace App\Models;

use Spatie\Tags\Tag;

/**
 * Spatie tag (alfasix/alfakit-tags) stored in `spatie_tags`: the catalogue's own `tags` table
 * belongs to App\Models\Tag (product tags). Used for customer segments and helpdesk tickets
 * through config('tags.tag_model').
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
