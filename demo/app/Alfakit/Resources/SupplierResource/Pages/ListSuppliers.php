<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\SupplierResource\Pages;

use AlfaSix\Alfakit\Actions\CreateAction;
use AlfaSix\Alfakit\Resources\Pages\ListApiRecords;
use App\Alfakit\Resources\SupplierResource;

class ListSuppliers extends ListApiRecords
{
    protected static string $resource = SupplierResource::class;

    public function getSubheading(): ?string
    {
        return __('suppliers.intro');
    }

    protected function getHeaderActions(): array
    {
        return [CreateAction::make()];
    }
}
