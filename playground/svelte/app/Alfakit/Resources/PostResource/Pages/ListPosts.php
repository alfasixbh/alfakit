<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\PostResource\Pages;

use App\Alfakit\Resources\PostResource;
use AlfaSix\Alfakit\Actions\CreateAction;
use AlfaSix\Alfakit\Resources\Pages\ListRecords;

class ListPosts extends ListRecords
{
    protected static string $resource = PostResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
