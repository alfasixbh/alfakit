<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitActivityLog\Tests\Fixtures\Models;

use Illuminate\Database\Eloquent\Model;

/** A model without `LogsActivity`: logged by the plugin's action logging. */
class Note extends Model
{
    protected $table = 'activity_notes';

    protected $guarded = [];
}
