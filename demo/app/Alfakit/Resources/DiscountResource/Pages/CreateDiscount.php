<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\DiscountResource\Pages;

use AlfaSix\Alfakit\Resources\Pages\CreateRecord;
use App\Alfakit\Resources\DiscountResource;

class CreateDiscount extends CreateRecord
{
    protected static string $resource = DiscountResource::class;

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        return DiscountResource::normalize([...$data, 'used_count' => 0]);
    }
}
