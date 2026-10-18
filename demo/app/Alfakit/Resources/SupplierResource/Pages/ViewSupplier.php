<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\SupplierResource\Pages;

use AlfaSix\Alfakit\Actions\DeleteAction;
use AlfaSix\Alfakit\Actions\EditAction;
use AlfaSix\Alfakit\Resources\Pages\ViewApiRecord;
use App\Alfakit\Resources\SupplierResource;

class ViewSupplier extends ViewApiRecord
{
    protected static string $resource = SupplierResource::class;

    protected function getHeaderActions(): array
    {
        return [EditAction::make(), DeleteAction::make()];
    }
}
