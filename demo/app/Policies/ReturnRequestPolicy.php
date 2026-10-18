<?php

declare(strict_types=1);

namespace App\Policies;

use App\Demo\Access;
use App\Models\ReturnRequest;
use App\Models\User;

/**
 * Returns: every member of the store sees them, support agents and up move them along
 * (submit, refund, reopen); approving is the workflow's job (owners and managers).
 */
class ReturnRequestPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->is_admin || $user->roleIn() !== null;
    }

    public function view(User $user, ReturnRequest $record): bool
    {
        return $this->viewAny($user);
    }

    public function create(User $user): bool
    {
        return Access::support($user);
    }

    public function update(User $user, ReturnRequest $record): bool
    {
        return Access::support($user);
    }

    public function delete(User $user, ReturnRequest $record): bool
    {
        return Access::owner($user);
    }

    public function reassignApprovals(User $user, ReturnRequest $record): bool
    {
        return Access::owner($user);
    }
}
