<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitActivityLog\Tests\Fixtures\Policies;

use Illuminate\Foundation\Auth\User;

class ActivityPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->getAttribute('name') === 'Auditor';
    }

    public function view(User $user): bool
    {
        return $user->getAttribute('name') === 'Auditor';
    }
}
