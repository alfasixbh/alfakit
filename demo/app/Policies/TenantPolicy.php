<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Store;
use App\Models\User;

/**
 * The tenant itself (`Store`): members see it, owners change it, any signed-in user may open
 * a new one (tenant registration), nobody deletes a store from the panel.
 */
class TenantPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Store $store): bool
    {
        return $user->is_admin || $user->roleIn($store) !== null;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Store $store): bool
    {
        return $user->isOwner($store);
    }

    public function delete(User $user, Store $store): bool
    {
        return false;
    }
}
