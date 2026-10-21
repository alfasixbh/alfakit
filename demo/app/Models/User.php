<?php

declare(strict_types=1);

namespace App\Models;

use AlfaSix\Alfakit\Auth\MultiFactor\App\Contracts\HasAppAuthentication;
use AlfaSix\Alfakit\Auth\MultiFactor\App\Contracts\HasAppAuthenticationRecovery;
use AlfaSix\Alfakit\Auth\MultiFactor\Concerns\InteractsWithAppAuthentication;
use AlfaSix\Alfakit\Auth\MultiFactor\Concerns\InteractsWithAppAuthenticationRecovery;
use AlfaSix\Alfakit\Auth\MultiFactor\Concerns\InteractsWithEmailAuthentication;
use AlfaSix\Alfakit\Auth\MultiFactor\Email\Contracts\HasEmailAuthentication;
use AlfaSix\Alfakit\Contracts\CanBeImpersonated;
use AlfaSix\Alfakit\Contracts\CanImpersonate;
use AlfaSix\Alfakit\Contracts\HasAvatar;
use AlfaSix\Alfakit\Contracts\HasDefaultTenant;
use AlfaSix\Alfakit\Contracts\HasTenants;
use AlfaSix\Alfakit\Panel;
use AlfaSix\AlfakitComments\Concerns\IsCommenter;
use AlfaSix\AlfakitComments\Contracts\Commenter;
use App\Enums\StaffRole;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Translation\HasLocalePreference;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Traits\HasRoles;

/**
 * Staff member. Belongs to one or more stores (tenants) with a role per store.
 *
 * @property int $id
 * @property string $name
 * @property string $email
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $title
 * @property string|null $locale
 * @property string|null $timezone
 * @property string|null $avatar_path
 * @property bool $is_admin
 * @property string|null $remember_token
 * @property string|null $app_authentication_secret
 * @property string|null $app_authentication_recovery_codes
 * @property bool $has_email_authentication
 * @property Carbon|null $invited_at
 */
#[Fillable(['name', 'email', 'password', 'title', 'locale', 'timezone', 'avatar_path', 'is_admin', 'invited_at'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable implements CanBeImpersonated, CanImpersonate, Commenter, HasAppAuthentication, HasAppAuthenticationRecovery, HasAvatar, HasDefaultTenant, HasEmailAuthentication, HasLocalePreference, HasTenants
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    // Plugins: Shield roles per store (spatie/laravel-permission, teams = stores) and the
    // comments author contract. The store ladder (`hasStaffRole()`) stays the demo's own.
    use HasRoles, IsCommenter;

    // Second factors (TOTP app with recovery codes, emailed codes) set up on the profile page.
    use InteractsWithAppAuthentication, InteractsWithAppAuthenticationRecovery, InteractsWithEmailAuthentication;

    public const DEMO_EMAIL = 'demo@alfakit.dev';

    public const DEMO_PASSWORD = 'password';

    /** Whether a second factor is active: shown as the "Two-factor" column of the staff table. */
    public function hasMultiFactorAuthentication(): bool
    {
        return $this->getAppAuthenticationSecret() !== null || $this->hasEmailAuthentication();
    }

    /**
     * Only the shared demo account may sign in as other staff (`UserPolicy::impersonate` also
     * checks the ranks), so an impersonated colleague can never impersonate anyone in turn.
     */
    public function canImpersonate(): bool
    {
        return $this->isDemoAccount();
    }

    /** The shared public account whose credentials are shown on the login page. */
    public function isDemoAccount(): bool
    {
        return $this->email === self::DEMO_EMAIL;
    }

    /** Admin accounts are never impersonated, even by other admins. */
    public function canBeImpersonated(): bool
    {
        return ! $this->is_admin;
    }

    /** @return BelongsToMany<Store, $this> */
    public function stores(): BelongsToMany
    {
        return $this->belongsToMany(Store::class, 'team_user', 'user_id', 'team_id')->withPivot('role')->withTimestamps();
    }

    /** @return array<int, Store> */
    public function getTenants(Panel $panel): array
    {
        return $this->stores()->where('is_active', true)->orderBy('name')->get()->all();
    }

    public function canAccessTenant(Model $tenant): bool
    {
        return $this->stores()->whereKey($tenant->getKey())->exists();
    }

    public function getDefaultTenant(Panel $panel): ?Model
    {
        // The store where the user has the highest role; owner before manager before staff.
        return $this->stores()->get()
            ->sortBy(fn (Store $store): int => -StaffRole::from((string) $store->getAttribute('pivot')?->getAttribute('role'))->rank() * 1000 + $store->id)
            ->first();
    }

    public function getAlfakitAvatarUrl(): ?string
    {
        return $this->avatar_path ? Storage::disk('demo')->url($this->avatar_path) : null;
    }

    public function preferredLocale(): ?string
    {
        return $this->locale;
    }

    /**
     * The user's role in a store (the current tenant by default).
     */
    public function roleIn(?Store $store = null): ?StaffRole
    {
        $store ??= alfakit()->getTenant();

        if (! $store instanceof Store) {
            return null;
        }

        $pivot = $this->stores()->whereKey($store->getKey())->first()?->pivot;

        return $pivot === null ? null : StaffRole::from((string) $pivot->getAttribute('role'));
    }

    /**
     * `$user->hasStaffRole('manager')` means manager or above in the current store. (`hasRole()`
     * is spatie's: the Shield roles owner, manager, support_agent and viewer of the store.)
     */
    public function hasStaffRole(StaffRole|string $role, ?Store $store = null): bool
    {
        if ($this->is_admin) {
            return true;
        }

        $role = $role instanceof StaffRole ? $role : StaffRole::from($role);
        $current = $this->roleIn($store);

        return $current !== null && $current->rank() >= $role->rank();
    }

    public function isOwner(?Store $store = null): bool
    {
        return $this->hasStaffRole(StaffRole::Owner, $store);
    }

    public function isManager(?Store $store = null): bool
    {
        return $this->hasStaffRole(StaffRole::Manager, $store);
    }

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_admin' => 'boolean',
            'has_email_authentication' => 'boolean',
            'invited_at' => 'datetime',
        ];
    }
}
