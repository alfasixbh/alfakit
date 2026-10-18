<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\BrandResource\Pages;

use AlfaSix\Alfakit\Resources\Pages\CreateRecord;
use App\Alfakit\Resources\BrandResource;

class CreateBrand extends CreateRecord
{
    protected static string $resource = BrandResource::class;
}
