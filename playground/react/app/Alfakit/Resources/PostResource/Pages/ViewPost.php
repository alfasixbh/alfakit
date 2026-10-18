<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\PostResource\Pages;

use App\Alfakit\Resources\PostResource;
use AlfaSix\Alfakit\Actions\EditAction;
use AlfaSix\Alfakit\Resources\Pages\ViewRecord;

class ViewPost extends ViewRecord
{
    protected static string $resource = PostResource::class;

    protected function getHeaderActions(): array
    {
        return [
            EditAction::make(),
        ];
    }
}
