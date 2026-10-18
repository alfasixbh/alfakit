<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\FeedbackResource\Pages;

use AlfaSix\Alfakit\Actions\DeleteAction;
use AlfaSix\Alfakit\Resources\Pages\EditRecord;
use App\Alfakit\Resources\FeedbackResource;

class EditFeedback extends EditRecord
{
    protected static string $resource = FeedbackResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }
}
