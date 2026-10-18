<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitTree\Tests\Fixtures;

use AlfaSix\Alfakit\Tests\Fixtures\Models\Team;
use AlfaSix\AlfakitTree\Concerns\ModelTree;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int|null $parent_id
 * @property int $order
 * @property string $title
 */
class Category extends Model
{
    use ModelTree;

    protected $table = 'tree_categories';

    protected $guarded = [];

    /**
     * @return BelongsTo<Team, $this>
     */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }
}
