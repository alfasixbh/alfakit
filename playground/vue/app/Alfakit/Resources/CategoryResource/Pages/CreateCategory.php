<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\CategoryResource\Pages;

use App\Alfakit\Resources\CategoryResource;
use AlfaSix\Alfakit\Resources\Pages\CreateRecord;

class CreateCategory extends CreateRecord
{
    protected static string $resource = CategoryResource::class;
}
