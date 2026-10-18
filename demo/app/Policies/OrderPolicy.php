<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\OrderStatus;
use App\Enums\StaffRole;
use App\Models\Order;
use App\Models\User;

class OrderPolicy extends StorePolicy
{
    /** Shipping is day-to-day work for any staff member, but only for orders that are paid or being packed. */
    public function ship(User $user, Order $order): bool
    {
        return $user->hasStaffRole(StaffRole::Staff)
            && in_array($order->status, [OrderStatus::Paid, OrderStatus::Processing], true);
    }

    /** Money leaving the store needs a manager. */
    public function refund(User $user, Order $order): bool
    {
        return $user->hasStaffRole(StaffRole::Manager)
            && in_array($order->status, [OrderStatus::Paid, OrderStatus::Processing, OrderStatus::Shipped, OrderStatus::Delivered], true);
    }

    public function cancel(User $user, Order $order): bool
    {
        return $user->hasStaffRole(StaffRole::Manager)
            && in_array($order->status, [OrderStatus::Pending, OrderStatus::Paid, OrderStatus::Processing], true);
    }
}
