<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitTree\Tests\Fixtures;

use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\AlfakitTree\Widgets\TreeWidget;

class CategoryTreeWidget extends TreeWidget
{
    protected static bool $isLazy = false;

    protected static ?string $model = Category::class;

    protected static ?int $maxDepth = 2;

    protected ?string $heading = 'Categories';

    public function getFormSchema(): array
    {
        return [TextInput::make('title')->required()];
    }
}
