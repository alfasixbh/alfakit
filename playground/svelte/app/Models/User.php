<?php

namespace App\Models;

use AlfaSix\Alfakit\Contracts\HasDefaultTenant;
use AlfaSix\Alfakit\Contracts\HasTenants;
use AlfaSix\AlfakitComments\Concerns\IsCommenter;
use AlfaSix\AlfakitComments\Contracts\Commenter;
use AlfaSix\AlfakitTeams\Concerns\HasTeams;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Cashier\Billable;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Spatie\Permission\Traits\HasRoles;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'email', 'password'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable implements Commenter, HasDefaultTenant, HasTenants, MustVerifyEmail, PasskeyUser
{
    // alfasix/alfakit-billing (Stripe through Laravel Cashier; nothing is required to subscribe).
    use Billable;

    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, PasskeyAuthenticatable, TwoFactorAuthenticatable;

    // alfasix/alfakit-shield (spatie/laravel-permission roles; admin@example.com is super_admin).
    use HasRoles;

    // alfasix/alfakit-teams: teams are the tenants of the /team panel (the admin panel has no tenancy).
    use HasTeams {
        // spatie/laravel-permission's HasRoles has a teams() stub too (its teams feature is off here).
        HasTeams::teams insteadof HasRoles;
    }

    // alfasix/alfakit-comments: name and avatar of comment authors.
    use IsCommenter;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }
}
