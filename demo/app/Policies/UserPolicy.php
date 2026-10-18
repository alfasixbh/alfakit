<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\StaffRole;
use App\Models\User;

/**
 * Staff management in the current store: managers see the team, owners change it.
 * `impersonate` is read by AlfaKit's `ImpersonateAction`: only a higher role may sign in
 * as a colleague, and nobody impersonates an admin.
 */
class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isManager();
    }

    public function view(User $user, User $target): bool
    {
        return $user->isManager() || $user->is($target);
    }

    public function create(User $user): bool
    {
        return $user->isOwner();
    }

    public function update(User $user, User $target): bool
    {
        return $user->is($target) || ($user->isOwner() && $this->outranks($user, $target));
    }

    public function delete(User $user, User $target): bool
    {
        return ! $user->is($target) && ! $target->is_admin && $user->isOwner() && $this->outranks($user, $target);
    }

    public function deleteAny(User $user): bool
    {
        return $user->isOwner();
    }

    public function impersonate(User $user, User $target): bool
    {
        return ! $user->is($target) && ! $target->is_admin && $user->canImpersonate() && $this->outranks($user, $target);
    }

    /** Admins outrank everyone; otherwise compare the roles in the current store. */
    private function outranks(User $user, User $target): bool
    {
        if ($user->is_admin) {
            return true;
        }

        $own = $user->roleIn()?->rank() ?? 0;
        $other = $target->roleIn()?->rank() ?? StaffRole::Staff->rank();

        return $own > $other;
    }
}
