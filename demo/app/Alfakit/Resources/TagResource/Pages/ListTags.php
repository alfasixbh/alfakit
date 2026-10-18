<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\TagResource\Pages;

use AlfaSix\Alfakit\Actions\CreateAction;
use AlfaSix\Alfakit\Resources\Pages\ListRecords;
use App\Alfakit\Resources\TagResource;

/** Tags are created and edited in modals; there are no separate pages. */
class ListTags extends ListRecords
{
    protected static string $resource = TagResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make()->schema(TagResource::fields()),
        ];
    }
}
