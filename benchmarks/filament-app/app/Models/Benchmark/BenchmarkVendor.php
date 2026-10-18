<?php

declare(strict_types=1);

namespace App\Models\Benchmark;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BenchmarkVendor extends Model
{
    protected $guarded = [];

    public function records(): HasMany
    {
        return $this->hasMany(BenchmarkRecord::class, 'vendor_id');
    }
}
