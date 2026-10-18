<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\CategoryProductResource\Pages;

use AlfaSix\Alfakit\Resources\Pages\CreateRecord;
use App\Alfakit\Resources\CategoryProductResource;

class CreateCategoryProduct extends CreateRecord
{
    protected static string $resource = CategoryProductResource::class;
}
