<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\StaffRole;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

/**
 * Role ladder shared by the sales policies: every staff member reads and writes, managers
 * delete, duplicate and refund, owners restore and purge. The panel already limits the data
 * to the current store, so these methods only look at the user's role in that store.
 */
abstract class StorePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasStaffRole(StaffRole::Staff);
    }

    public function view(User $user, Model $record): bool
    {
        return $user->hasStaffRole(StaffRole::Staff);
    }

    public function create(User $user): bool
    {
        return $user->hasStaffRole(StaffRole::Staff);
    }

    public function update(User $user, Model $record): bool
    {
        return $user->hasStaffRole(StaffRole::Staff);
    }

    public function delete(User $user, Model $record): bool
    {
        return $user->hasStaffRole(StaffRole::Manager);
    }

    public function deleteAny(User $user): bool
    {
        return $user->hasStaffRole(StaffRole::Manager);
    }

    public function restore(User $user, Model $record): bool
    {
        return $user->isOwner();
    }

    public function forceDelete(User $user, Model $record): bool
    {
        return $user->isOwner();
    }

    public function replicate(User $user, Model $record): bool
    {
        return $user->hasStaffRole(StaffRole::Manager);
    }
}
