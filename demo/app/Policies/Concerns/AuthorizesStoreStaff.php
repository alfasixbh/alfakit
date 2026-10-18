<?php

declare(strict_types=1);

namespace App\Policies\Concerns;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

/**
 * The demo's role ladder, shared by every catalog policy: any staff member of the current
 * store can look, managers can create and edit, owners can delete. `is_admin` bypasses all.
 */
trait AuthorizesStoreStaff
{
    public function viewAny(User $user): bool
    {
        return $user->is_admin || $user->roleIn() !== null;
    }

    public function view(User $user, Model $model): bool
    {
        return $this->viewAny($user);
    }

    public function create(User $user): bool
    {
        return $user->isManager();
    }

    public function update(User $user, Model $model): bool
    {
        return $user->isManager();
    }

    public function delete(User $user, Model $model): bool
    {
        return $user->isOwner();
    }

    public function deleteAny(User $user): bool
    {
        return $user->isOwner();
    }

    public function restore(User $user, Model $model): bool
    {
        return $user->isOwner();
    }

    public function forceDelete(User $user, Model $model): bool
    {
        return $user->isOwner();
    }

    public function reorder(User $user): bool
    {
        return $user->isManager();
    }
}
