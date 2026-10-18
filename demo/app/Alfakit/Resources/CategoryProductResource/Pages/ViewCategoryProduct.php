<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\CategoryProductResource\Pages;

use AlfaSix\Alfakit\Actions\EditAction;
use AlfaSix\Alfakit\Resources\Pages\ViewRecord;
use App\Alfakit\Resources\CategoryProductResource;

class ViewCategoryProduct extends ViewRecord
{
    protected static string $resource = CategoryProductResource::class;

    protected function getHeaderActions(): array
    {
        return [
            EditAction::make(),
        ];
    }
}
