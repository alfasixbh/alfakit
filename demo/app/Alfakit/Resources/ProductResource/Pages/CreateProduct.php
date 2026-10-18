<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\ProductResource\Pages;

use AlfaSix\Alfakit\Resources\Pages\CreateRecord;
use App\Alfakit\Resources\ProductResource;
use App\Enums\ProductStatus;

class CreateProduct extends CreateRecord
{
    protected static string $resource = ProductResource::class;

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        if (($data['status'] ?? null) === ProductStatus::Active->value && empty($data['published_at'])) {
            $data['published_at'] = now();
        }

        return $data;
    }
}
