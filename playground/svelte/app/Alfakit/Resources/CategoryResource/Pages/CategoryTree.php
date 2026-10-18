<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\CategoryResource\Pages;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\AlfakitTree\Pages\TreePage;
use App\Alfakit\Resources\CategoryResource;

/** alfasix/alfakit-tree: drag-and-drop tree of the categories (parent_id, order). */
class CategoryTree extends TreePage
{
    protected static string $resource = CategoryResource::class;

    protected static ?int $maxDepth = 3;

    public function getTitle(): string
    {
        return __('playground.nav.category_tree');
    }

    protected function getHeaderActions(): array
    {
        return [
            Action::make('list')->label(__('playground.categories.list_view'))->icon('list')->color('gray')->url(CategoryResource::getUrl('index')),
            ...parent::getHeaderActions(),
        ];
    }
}
