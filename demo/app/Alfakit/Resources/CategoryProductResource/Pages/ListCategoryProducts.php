<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\CategoryProductResource\Pages;

use AlfaSix\Alfakit\Actions\CreateAction;
use AlfaSix\Alfakit\Resources\Pages\ListRecords;
use App\Alfakit\Resources\CategoryProductResource;

class ListCategoryProducts extends ListRecords
{
    protected static string $resource = CategoryProductResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
