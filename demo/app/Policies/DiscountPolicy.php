<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\StaffRole;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

/** Discounts change what customers pay, so writing them is a manager's job. */
class DiscountPolicy extends StorePolicy
{
    public function create(User $user): bool
    {
        return $user->hasStaffRole(StaffRole::Manager);
    }

    public function update(User $user, Model $record): bool
    {
        return $user->hasStaffRole(StaffRole::Manager);
    }
}
