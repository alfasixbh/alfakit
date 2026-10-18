<?php

declare(strict_types=1);

namespace App\Features;

use App\Models\User;
use Laravel\Pennant\Attributes\Name;

/**
 * Laravel Pennant feature managed in System › Feature flags (alfasix/alfakit-feature-flags).
 */
#[Name('new-post-editor')]
class NewPostEditor
{
    /** Read by alfasix/alfakit-feature-flags; a method (not the attribute) so it is translated. */
    public static function description(): string
    {
        return __('playground.features.new_post_editor');
    }

    public function resolve(User $user): bool
    {
        return $user->email === 'admin@example.com';
    }
}
