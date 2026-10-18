<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\CategoryResource\Pages;

use App\Alfakit\Resources\CategoryResource;
use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Actions\CreateAction;
use AlfaSix\Alfakit\Resources\Pages\ListRecords;

class ListCategories extends ListRecords
{
    protected static string $resource = CategoryResource::class;

    protected function getHeaderActions(): array
    {
        return [
            // alfasix/alfakit-tree: the same categories as a drag-and-drop tree.
            Action::make('tree')->label(__('playground.categories.tree_view'))->icon('list-tree')->color('gray')->url(CategoryResource::getUrl('tree')),
            CreateAction::make(),
        ];
    }
}
