<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\DiscountResource\Pages;

use AlfaSix\Alfakit\Actions\CreateAction;
use AlfaSix\Alfakit\Resources\Pages\ListRecords;
use App\Alfakit\Resources\DiscountResource;

class ListDiscounts extends ListRecords
{
    protected static string $resource = DiscountResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make()->icon('plus'),
        ];
    }
}
