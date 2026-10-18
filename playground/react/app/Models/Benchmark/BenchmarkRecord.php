<?php

declare(strict_types=1);

namespace App\Models\Benchmark;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BenchmarkRecord extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'quantity' => 'integer',
            'unit_price' => 'float',
            'weight' => 'float',
            'rating' => 'float',
            'shipped_at' => 'datetime',
        ];
    }

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(BenchmarkVendor::class, 'vendor_id');
    }

    public function region(): BelongsTo
    {
        return $this->belongsTo(BenchmarkRegion::class, 'region_id');
    }
}
