<?php

declare(strict_types=1);

namespace App\Demo;

use App\Models\User;

/**
 * Who may open which plugin area, from the Shield roles of the current store
 * (spatie/laravel-permission with teams = stores): owner, manager, support agent and viewer.
 * The demo account is the owner of every store, so it sees everything.
 *
 * The catalogue's own policies keep using the store ladder (`User::hasStaffRole()`); these
 * roles gate the first-party plugins.
 */
final class Access
{
    public const OWNER = 'owner';

    public const MANAGER = 'manager';

    public const SUPPORT = 'support_agent';

    public const VIEWER = 'viewer';

    public const ROLES = [self::OWNER, self::MANAGER, self::SUPPORT, self::VIEWER];

    public static function is(mixed $user, string ...$roles): bool
    {
        if (! $user instanceof User) {
            return false;
        }

        return $user->hasRole($roles);
    }

    public static function owner(mixed $user): bool
    {
        return self::is($user, self::OWNER);
    }

    public static function managers(mixed $user): bool
    {
        return self::is($user, self::OWNER, self::MANAGER);
    }

    public static function support(mixed $user): bool
    {
        return self::is($user, self::OWNER, self::MANAGER, self::SUPPORT);
    }

    /** Viewers look around; everyone else may change things. */
    public static function viewerOnly(mixed $user): bool
    {
        return $user instanceof User && ! self::support($user);
    }
}
