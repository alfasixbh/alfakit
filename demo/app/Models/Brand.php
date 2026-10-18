<?php

declare(strict_types=1);

namespace App\Models;

use AlfaSix\Alfakit\Tenancy\SharedAcrossTenants;
use Database\Factories\BrandFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property string|null $country
 * @property int|null $founded_year
 * @property string|null $description
 * @property string|null $website
 * @property string|null $logo_path
 * @property bool $is_featured
 */
#[SharedAcrossTenants]
#[Fillable(['name', 'slug', 'country', 'founded_year', 'description', 'website', 'logo_path', 'is_featured'])]
class Brand extends Model
{
    /** @use HasFactory<BrandFactory> */
    use HasFactory;

    /** @return HasMany<Product, $this> */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    protected function casts(): array
    {
        return ['is_featured' => 'boolean', 'founded_year' => 'integer'];
    }
}
