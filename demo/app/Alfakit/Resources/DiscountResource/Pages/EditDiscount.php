<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\DiscountResource\Pages;

use AlfaSix\Alfakit\Actions\DeleteAction;
use AlfaSix\Alfakit\Resources\Pages\EditRecord;
use App\Alfakit\Resources\DiscountResource;

class EditDiscount extends EditRecord
{
    protected static string $resource = DiscountResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }

    protected function mutateFormDataBeforeSave(array $data): array
    {
        return DiscountResource::normalize($data);
    }
}
