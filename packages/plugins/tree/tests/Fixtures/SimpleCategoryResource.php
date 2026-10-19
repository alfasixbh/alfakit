<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitTree\Tests\Fixtures;

use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Resources\Resource;
use AlfaSix\Alfakit\Schemas\Schema;

/**
 * A simple (modal) resource: no create or edit page, only the tree.
 */
class SimpleCategoryResource extends Resource
{
    protected static ?string $model = Category::class;

    protected static ?string $slug = 'simple-categories';

    protected static ?string $recordTitleAttribute = 'title';

    public static function form(Schema $schema): Schema
    {
        return $schema->components([TextInput::make('title')->required()]);
    }

    public static function getPages(): array
    {
        return ['index' => SimpleCategoryTree::route('/')];
    }
}
