<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitTree\Tests\Fixtures;

use AlfaSix\AlfakitTree\Pages\TreePage;

/**
 * A tree page without `getFormSchema()`: it falls back to the resource's form.
 */
class SimpleCategoryTree extends TreePage
{
    protected static string $resource = SimpleCategoryResource::class;
}
