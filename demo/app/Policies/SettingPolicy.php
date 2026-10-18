<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Setting;
use App\Models\User;

/**
 * Store settings (the singular Settings resource): managers may read and change them.
 */
class SettingPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isManager();
    }

    public function view(User $user, Setting $setting): bool
    {
        return $user->isManager();
    }

    public function create(User $user): bool
    {
        return $user->isManager();
    }

    public function update(User $user, Setting $setting): bool
    {
        return $user->isManager();
    }

    public function delete(User $user, Setting $setting): bool
    {
        return false;
    }
}
