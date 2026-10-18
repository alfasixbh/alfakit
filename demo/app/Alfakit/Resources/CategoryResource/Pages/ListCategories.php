<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\CategoryResource\Pages;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Actions\CreateAction;
use AlfaSix\Alfakit\Resources\Pages\ListRecords;
use App\Alfakit\Resources\CategoryResource;

class ListCategories extends ListRecords
{
    protected static string $resource = CategoryResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Action::make('tree')
                ->label(__('plugins.tree.open'))
                ->icon('list-tree')
                ->color('gray')
                ->url(fn (): string => CategoryResource::getUrl('tree')),
            CreateAction::make(),
        ];
    }
}
