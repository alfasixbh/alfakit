<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitTree\Tests\Fixtures;

use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\AlfakitTree\Pages\TreePage;

class CategoryTree extends TreePage
{
    protected static string $resource = CategoryResource::class;

    protected static ?int $maxDepth = 3;

    public function getFormSchema(): array
    {
        return [TextInput::make('title')->required()];
    }
}
