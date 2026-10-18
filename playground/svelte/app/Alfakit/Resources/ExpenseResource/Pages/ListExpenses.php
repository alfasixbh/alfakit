<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\ExpenseResource\Pages;

use AlfaSix\Alfakit\Actions\CreateAction;
use AlfaSix\Alfakit\Resources\Pages\ListRecords;
use App\Alfakit\Resources\ExpenseResource;

class ListExpenses extends ListRecords
{
    protected static string $resource = ExpenseResource::class;

    protected function getHeaderActions(): array
    {
        return [CreateAction::make()];
    }
}
