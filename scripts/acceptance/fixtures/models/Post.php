<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

// Typed relationships, as in the quick start.
class Post extends Model
{
    protected $fillable = ['title', 'body'];

    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class);
    }
}
