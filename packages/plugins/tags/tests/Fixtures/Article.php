<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitTags\Tests\Fixtures;

use Illuminate\Database\Eloquent\Model;
use Spatie\Tags\HasTags;

/**
 * @property int $id
 * @property string $title
 */
class Article extends Model
{
    use HasTags;

    protected $guarded = [];
}
