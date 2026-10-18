<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\ReturnRequestResource\Pages;

use AlfaSix\Alfakit\Resources\Pages\ViewRecord;
use AlfaSix\AlfakitWorkflows\Actions\WorkflowActions;
use App\Alfakit\Resources\ReturnRequestResource;

class ViewReturnRequest extends ViewRecord
{
    protected static string $resource = ReturnRequestResource::class;

    protected function getHeaderActions(): array
    {
        return [WorkflowActions::make()->dropdown(false)];
    }
}
