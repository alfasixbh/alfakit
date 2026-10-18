<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\CategoryResource\Pages;

use AlfaSix\AlfakitTree\Pages\TreePage;
use App\Alfakit\Resources\CategoryResource;
use App\Models\Category;
use Illuminate\Database\Eloquent\Model;

/**
 * The category tree (alfasix/alfakit-tree): drag categories to nest or reorder them, or move
 * them with the keyboard, then save in one request. Categories are shared by every store.
 */
class CategoryTree extends TreePage
{
    protected static string $resource = CategoryResource::class;

    protected static ?int $maxDepth = 3;

    protected static ?string $navigationIcon = 'list-tree';

    public function getTitle(): string
    {
        return __('plugins.tree.title');
    }

    public function getSubheading(): ?string
    {
        return __('plugins.tree.subheading');
    }

    public function getTreeRecordIcon(Model $record): ?string
    {
        /** @var Category $record */
        return $record->icon ?: 'folder';
    }
}
