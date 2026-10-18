<?php

declare(strict_types=1);

namespace App\Policies;

use App\Demo\Access;
use App\Models\User;
use Spatie\Permission\Models\Role;

/**
 * Shield roles of the current store (registered by alfakit-shield as `App\Policies\RolePolicy`):
 * owners manage them; the four seeded roles can't be deleted, so the demo always has them.
 */
class RolePolicy
{
    public function viewAny(User $user): bool
    {
        return Access::owner($user);
    }

    public function view(User $user, Role $role): bool
    {
        return Access::owner($user);
    }

    public function create(User $user): bool
    {
        return Access::owner($user);
    }

    public function update(User $user, Role $role): bool
    {
        return Access::owner($user);
    }

    public function delete(User $user, Role $role): bool
    {
        return Access::owner($user) && ! in_array($role->name, Access::ROLES, true);
    }

    public function deleteAny(User $user): bool
    {
        return Access::owner($user);
    }
}
