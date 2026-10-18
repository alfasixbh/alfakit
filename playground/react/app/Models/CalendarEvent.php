<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;

/**
 * An event of the Calendar page (alfasix/alfakit-calendar).
 *
 * @property int $id
 * @property string $title
 * @property string|null $description
 * @property CarbonImmutable $starts_at
 * @property CarbonImmutable|null $ends_at
 * @property bool $all_day
 * @property string|null $color
 */
class CalendarEvent extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'all_day' => 'boolean',
        ];
    }
}
