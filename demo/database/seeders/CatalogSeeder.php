<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Demo\BrandArtwork;
use App\Models\Brand;
use Illuminate\Database\Seeder;

/**
 * Catalog extras on top of DemoSeeder: a local SVG monogram for every brand so the brand
 * table and the product cards never show an empty avatar.
 */
class CatalogSeeder extends Seeder
{
    public function run(): void
    {
        Brand::query()->whereNull('logo_path')->each(function (Brand $brand): void {
            $brand->forceFill(['logo_path' => BrandArtwork::store($brand->slug, $brand->name)])->save();
        });
    }
}
