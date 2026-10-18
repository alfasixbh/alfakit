<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\ExpenseResource\Pages;

use AlfaSix\Alfakit\Actions\EditAction;
use AlfaSix\Alfakit\Resources\Pages\ViewRecord;
use AlfaSix\AlfakitWorkflows\Actions\WorkflowActions;
use App\Alfakit\Resources\ExpenseResource;

class ViewExpense extends ViewRecord
{
    protected static string $resource = ExpenseResource::class;

    protected function getHeaderActions(): array
    {
        return [
            WorkflowActions::make()->dropdown(false),
            EditAction::make(),
        ];
    }
}
