<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\SupplierResource\Pages;

use AlfaSix\Alfakit\Resources\Pages\CreateApiRecord;
use App\Alfakit\Resources\SupplierResource;

class CreateSupplier extends CreateApiRecord
{
    protected static string $resource = SupplierResource::class;
}
