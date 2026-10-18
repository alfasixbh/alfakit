<?php

declare(strict_types=1);

namespace App\Models\Benchmark;

use Illuminate\Database\Eloquent\Model;

/** The 1,000,000-row benchmark table (see BenchBigRecordsSeeder). */
class BenchBigRecord extends Model
{
    protected $table = 'bench_big_records';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'unit_price' => 'float',
        ];
    }
}
