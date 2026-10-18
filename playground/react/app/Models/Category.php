<?php

namespace App\Models;

use AlfaSix\AlfakitTree\Concerns\HasTreeStructure;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    use HasFactory;

    // alfasix/alfakit-tree: parent_id + order columns, shown by CategoryResource\Pages\CategoryTree.
    use HasTreeStructure;

    protected string $treeTitleColumn = 'name';

    protected $guarded = [];

    public function posts(): HasMany
    {
        return $this->hasMany(Post::class);
    }
}
