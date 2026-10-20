<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// Untyped relationships (no return types), as many users write them: the nested resource
// generator must still find `post()` and `replies()`.
class Comment extends Model
{
    protected $fillable = ['post_id', 'body'];

    public function post()
    {
        return $this->belongsTo(Post::class);
    }

    public function replies()
    {
        return $this->hasMany(Reply::class);
    }
}
