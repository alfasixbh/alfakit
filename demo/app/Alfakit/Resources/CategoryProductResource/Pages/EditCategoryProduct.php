<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\CategoryProductResource\Pages;

use AlfaSix\Alfakit\Actions\ViewAction;
use AlfaSix\Alfakit\Resources\Pages\EditRecord;
use App\Alfakit\Resources\CategoryProductResource;

class EditCategoryProduct extends EditRecord
{
    protected static string $resource = CategoryProductResource::class;

    protected function getHeaderActions(): array
    {
        return [
            ViewAction::make(),
        ];
    }
}
