<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\CategoryResource\Pages;

use AlfaSix\Alfakit\Actions\DeleteAction;
use AlfaSix\Alfakit\Resources\Pages\EditRecord;
use App\Alfakit\Resources\CategoryResource;

class EditCategory extends EditRecord
{
    protected static string $resource = CategoryResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }
}
