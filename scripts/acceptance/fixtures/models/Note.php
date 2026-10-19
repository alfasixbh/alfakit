<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// No SoftDeletes: `make:alfakit-resource Note --generate --soft-deletes` must not produce a
// resource with a trashed filter and restore actions that crash.
class Note extends Model
{
    protected $fillable = ['title'];
}
