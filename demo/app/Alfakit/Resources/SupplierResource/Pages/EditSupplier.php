<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\SupplierResource\Pages;

use AlfaSix\Alfakit\Actions\DeleteAction;
use AlfaSix\Alfakit\Actions\ViewAction;
use AlfaSix\Alfakit\Resources\Pages\EditApiRecord;
use App\Alfakit\Resources\SupplierResource;

class EditSupplier extends EditApiRecord
{
    protected static string $resource = SupplierResource::class;

    protected function getHeaderActions(): array
    {
        return [ViewAction::make(), DeleteAction::make()];
    }
}
