<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitActivityLog;

use AlfaSix\Alfakit\Contracts\Plugin;
use AlfaSix\Alfakit\Panel;
use AlfaSix\Alfakit\Support\Concerns\EvaluatesClosures;
use AlfaSix\AlfakitActivityLog\Resources\ActivityResource;
use AlfaSix\AlfakitActivityLog\Support\ActionActivityLogger;
use AlfaSix\AlfakitActivityLog\Support\TenantActivityScope;
use Closure;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use InvalidArgumentException;

/**
 * Browse spatie/laravel-activitylog activities in a panel.
 *
 * ```php
 * $panel->plugin(
 *     ActivityLogPlugin::make()
 *         ->navigationGroup('Settings')
 *         ->authorize(fn (User $user): bool => $user->is_admin),
 * );
 * ```
 */
class ActivityLogPlugin implements Plugin
{
    use EvaluatesClosures;

    public const ID = 'activity-log';

    /** @var class-string<ActivityResource> */
    protected string $resource = ActivityResource::class;

    protected string|Closure|null $label = null;

    protected string|Closure|null $pluralLabel = null;

    protected string|Closure|null $navigationLabel = null;

    protected string|Closure|null $navigationGroup = null;

    protected string|Closure|null $navigationIcon = 'history';

    protected int|Closure|null $navigationSort = null;

    protected bool|Closure $hasNavigationCountBadge = false;

    protected bool|Closure $shouldRegisterNavigation = true;

    protected bool|Closure|null $authorizeUsing = null;

    protected bool|Closure $isScopedToTenant = true;

    protected ?Closure $scopeToTenantUsing = null;

    protected bool $recordsTenant = true;

    protected bool $logsActions = false;

    public static function make(): static
    {
        return new static;
    }

    /**
     * The plugin registered on the current panel, or a plugin with the default options when
     * the panel doesn't have it (a resource registered by hand).
     */
    public static function get(): static
    {
        $panel = alfakit()->getCurrentOrDefaultPanel();

        if ($panel->hasPlugin(self::ID)) {
            $plugin = $panel->getPlugin(self::ID);

            if ($plugin instanceof static) {
                return $plugin;
            }
        }

        return static::make();
    }

    public function getId(): string
    {
        return self::ID;
    }

    public function register(Panel $panel): void
    {
        $panel->resources([$this->getResourceClass()]);

        if ($this->logsActions) {
            ActionActivityLogger::register();
        }
    }

    public function boot(Panel $panel): void
    {
        if ($this->recordsTenant && $panel->hasTenancy()) {
            TenantActivityScope::registerTenantRecorder();
        }
    }

    protected function getEvaluationIdentifier(): string
    {
        return 'plugin';
    }

    /**
     * @return array<mixed>
     */
    protected function resolveDefaultClosureDependencyForEvaluationByName(string $parameterName): array
    {
        return match ($parameterName) {
            'panel' => [alfakit()->getCurrentOrDefaultPanel()],
            'user' => [alfakit()->getCurrentOrDefaultPanel()->auth()->user()],
            'tenant' => [alfakit()->getTenant()],
            default => [],
        };
    }

    // ---------------------------------------------------------------- Resource

    /**
     * Replace the resource with your own subclass of `ActivityResource`.
     *
     * @param  class-string<ActivityResource>  $resource
     */
    public function resourceClass(string $resource): static
    {
        if (! is_a($resource, ActivityResource::class, true)) {
            throw new InvalidArgumentException("The activity log resource [{$resource}] must extend [".ActivityResource::class.'].');
        }

        $this->resource = $resource;

        return $this;
    }

    /**
     * @return class-string<ActivityResource>
     */
    public function getResourceClass(): string
    {
        return $this->resource;
    }

    public function label(string|Closure|null $label): static
    {
        $this->label = $label;

        return $this;
    }

    public function getLabel(): string
    {
        return (string) ($this->evaluate($this->label) ?? __('alfakit-activity-log::activity-log.resource.label'));
    }

    public function pluralLabel(string|Closure|null $label): static
    {
        $this->pluralLabel = $label;

        return $this;
    }

    public function getPluralLabel(): string
    {
        return (string) ($this->evaluate($this->pluralLabel) ?? __('alfakit-activity-log::activity-log.resource.plural_label'));
    }

    // ---------------------------------------------------------------- Navigation

    public function navigationLabel(string|Closure|null $label): static
    {
        $this->navigationLabel = $label;

        return $this;
    }

    public function getNavigationLabel(): string
    {
        return (string) ($this->evaluate($this->navigationLabel) ?? __('alfakit-activity-log::activity-log.resource.navigation_label'));
    }

    public function navigationGroup(string|Closure|null $group): static
    {
        $this->navigationGroup = $group;

        return $this;
    }

    public function getNavigationGroup(): ?string
    {
        $group = $this->evaluate($this->navigationGroup);

        return is_string($group) ? $group : null;
    }

    public function navigationIcon(string|Closure|null $icon): static
    {
        $this->navigationIcon = $icon;

        return $this;
    }

    public function getNavigationIcon(): ?string
    {
        $icon = $this->evaluate($this->navigationIcon);

        return is_string($icon) ? $icon : null;
    }

    public function navigationSort(int|Closure|null $sort): static
    {
        $this->navigationSort = $sort;

        return $this;
    }

    public function getNavigationSort(): ?int
    {
        $sort = $this->evaluate($this->navigationSort);

        return is_int($sort) ? $sort : null;
    }

    /**
     * Show the number of activities (in the current tenant) as a navigation badge.
     */
    public function navigationCountBadge(bool|Closure $condition = true): static
    {
        $this->hasNavigationCountBadge = $condition;

        return $this;
    }

    public function hasNavigationCountBadge(): bool
    {
        return (bool) $this->evaluate($this->hasNavigationCountBadge);
    }

    public function registerNavigation(bool|Closure $condition = true): static
    {
        $this->shouldRegisterNavigation = $condition;

        return $this;
    }

    public function shouldRegisterNavigation(): bool
    {
        return (bool) $this->evaluate($this->shouldRegisterNavigation);
    }

    // ---------------------------------------------------------------- Authorisation

    /**
     * Who may open the activity log. Without it, the policy of the activity model decides
     * (`viewAny`, `view`), and everyone may when there is no policy.
     */
    public function authorize(bool|Closure|null $callback = true): static
    {
        $this->authorizeUsing = $callback;

        return $this;
    }

    public function hasAuthorization(): bool
    {
        return $this->authorizeUsing !== null;
    }

    public function isAuthorized(): bool
    {
        return $this->evaluateUserAuthorization($this->authorizeUsing);
    }

    // ---------------------------------------------------------------- Tenancy

    /**
     * On panels with tenancy, list only the activities of the current tenant (default). See
     * `TenantActivityScope` for what belongs to a tenant.
     */
    public function scopeToTenant(bool|Closure $condition = true): static
    {
        $this->isScopedToTenant = $condition;

        return $this;
    }

    public function isScopedToTenant(): bool
    {
        return (bool) $this->evaluate($this->isScopedToTenant);
    }

    /**
     * Replace the tenant scope: `fn (Builder $query, Model $tenant) => $query->where(...)`.
     */
    public function scopeToTenantUsing(?Closure $callback): static
    {
        $this->scopeToTenantUsing = $callback;

        return $this;
    }

    /**
     * Store the current tenant in the properties of every activity logged during a panel
     * request (default), so activities on records without a tenant relationship and
     * activities of deleted records stay in the tenant's log.
     */
    public function recordTenant(bool $condition = true): static
    {
        $this->recordsTenant = $condition;

        return $this;
    }

    public function recordsTenant(): bool
    {
        return $this->recordsTenant;
    }

    /**
     * @template TModel of Model
     *
     * @param  Builder<TModel>  $query
     * @return Builder<TModel>
     */
    public function applyTenantScope(Builder $query): Builder
    {
        $panel = alfakit()->getCurrentOrDefaultPanel();
        $tenant = $panel->hasTenancy() ? alfakit()->getTenant() : null;

        if ($tenant === null || ! $this->isScopedToTenant()) {
            return $query;
        }

        if ($this->scopeToTenantUsing !== null) {
            $result = $this->evaluate($this->scopeToTenantUsing, ['query' => $query, 'tenant' => $tenant], [Builder::class => $query, Model::class => $tenant]);

            return $result instanceof Builder ? $result : $query;
        }

        return TenantActivityScope::apply($query, $tenant, $panel->getTenantOwnershipRelationshipName());
    }

    // ---------------------------------------------------------------- Action logging

    /**
     * Log an activity whenever AlfaKit's `CreateAction`, `EditAction` and `DeleteAction`
     * (and their bulk delete counterpart) run on a model that doesn't use `LogsActivity`
     * itself. For resource create and edit pages, add the `LogsAlfakitActions` trait.
     */
    public function logActions(bool $condition = true): static
    {
        $this->logsActions = $condition;

        return $this;
    }

    public function logsActions(): bool
    {
        return $this->logsActions;
    }
}
