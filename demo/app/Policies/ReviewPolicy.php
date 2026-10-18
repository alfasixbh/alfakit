<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Review;
use App\Models\User;
use App\Policies\Concerns\AuthorizesStoreStaff;

class ReviewPolicy
{
    use AuthorizesStoreStaff;

    /** Moderation is a manager's job; `authorizeIndividualRecords('approve')` checks each row. */
    public function approve(User $user, Review $review): bool
    {
        return $user->isManager();
    }

    public function reject(User $user, Review $review): bool
    {
        return $user->isManager();
    }
}
