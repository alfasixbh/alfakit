<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitTree\Tests\Fixtures;

use Illuminate\Contracts\Auth\Authenticatable;

/**
 * Only users without "viewer" in their e-mail address may rearrange categories.
 */
class CategoryPolicy
{
    public function viewAny(?Authenticatable $user): bool
    {
        return true;
    }

    public function reorder(?Authenticatable $user): bool
    {
        return ! str_contains((string) $user?->getAttribute('email'), 'viewer');
    }

    public function update(?Authenticatable $user, Category $category): bool
    {
        return true;
    }

    public function delete(?Authenticatable $user, Category $category): bool
    {
        return $category->title !== 'Keep';
    }

    public function create(?Authenticatable $user): bool
    {
        return true;
    }
}
