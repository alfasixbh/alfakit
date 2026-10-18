<?php

declare(strict_types=1);

namespace App\Models;

use AlfaSix\Alfakit\Auth\MultiFactor\App\Contracts\HasAppAuthentication;
use AlfaSix\Alfakit\Auth\MultiFactor\App\Contracts\HasAppAuthenticationRecovery;
use AlfaSix\Alfakit\Auth\MultiFactor\Concerns\InteractsWithAppAuthentication;
use AlfaSix\Alfakit\Auth\MultiFactor\Concerns\InteractsWithAppAuthenticationRecovery;
use AlfaSix\Alfakit\Auth\MultiFactor\Concerns\InteractsWithEmailAuthentication;
use AlfaSix\Alfakit\Auth\MultiFactor\Email\Contracts\HasEmailAuthentication;
use AlfaSix\Alfakit\Contracts\CanAccessPanel;
use AlfaSix\Alfakit\Contracts\CanImpersonate;
use AlfaSix\Alfakit\Contracts\HasDefaultTenant;
use AlfaSix\Alfakit\Contracts\HasTenants;
use AlfaSix\Alfakit\Panel;
use AlfaSix\AlfakitComments\Concerns\IsCommenter;
use AlfaSix\AlfakitComments\Contracts\Commenter;
use AlfaSix\AlfakitTeams\Concerns\HasTeams;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Contracts\Translation\HasLocalePreference;
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
 * @property bool $is_customer
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'email', 'password', 'locale', 'timezone'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable implements CanAccessPanel, CanImpersonate, Commenter, HasAppAuthentication, HasAppAuthenticationRecovery, HasDefaultTenant, HasEmailAuthentication, HasLocalePreference, HasTenants, MustVerifyEmail, PasskeyUser
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

    // Alfakit multi-factor authentication (profile page → set up, login → challenge).
    use InteractsWithAppAuthentication, InteractsWithAppAuthenticationRecovery, InteractsWithEmailAuthentication;

    // alfasix/alfakit-comments: name and avatar of comment authors.
    use IsCommenter;

    /**
     * Customers (customer@example.com) stay out of the admin and team panels; they use the
     * customer portal (/portal) and the app's own pages. Everyone else may open every panel
     * (the portal too, to preview it).
     */
    public function canAccessPanel(Panel $panel): bool
    {
        return ! ($this->is_customer && in_array($panel->getId(), ['admin', 'team'], true));
    }

    /** Showcase: only the seeded admin may impersonate (Showcase › Users). */
    public function canImpersonate(): bool
    {
        return $this->email === 'admin@example.com';
    }

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
            'is_customer' => 'boolean',
        ];
    }

    /** Read by Alfakit (and Laravel mail/notifications) to pick the user's language. */
    public function preferredLocale(): ?string
    {
        return $this->locale;
    }
}
