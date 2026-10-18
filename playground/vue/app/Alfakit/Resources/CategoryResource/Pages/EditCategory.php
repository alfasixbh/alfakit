<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\CategoryResource\Pages;

use App\Alfakit\Resources\CategoryResource;
use AlfaSix\Alfakit\Actions\DeleteAction;
use AlfaSix\Alfakit\Resources\Pages\EditRecord;

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
