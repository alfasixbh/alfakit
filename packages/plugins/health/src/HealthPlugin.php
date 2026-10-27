<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitHealth;

use AlfaSix\Alfakit\Contracts\Plugin;
use AlfaSix\Alfakit\Panel;
use AlfaSix\Alfakit\Support\Concerns\EvaluatesClosures;
use AlfaSix\AlfakitHealth\Pages\Health;
use AlfaSix\AlfakitHealth\Widgets\HealthStatusWidget;
use Closure;
use InvalidArgumentException;

/**
 * Show spatie/laravel-health check results in a panel.
 *
 * ```php
 * $panel->plugin(
 *     HealthPlugin::make()
 *         ->dashboardWidget()
 *         ->authorize(fn (User $user): bool => $user->is_admin),
 * );
 * ```
 */
class HealthPlugin implements Plugin
{
    use EvaluatesClosures;

    public const ID = 'health';

    /** @var class-string<Health> */
    protected string $page = Health::class;

    /** @var class-string<HealthStatusWidget> */
    protected string $widget = HealthStatusWidget::class;

    protected bool $hasDashboardWidget = false;

    protected ?string $pollingInterval = '10s';

    protected bool $sendsNotificationsOnRefresh = false;

    protected bool|Closure|null $authorizeUsing = null;

    protected string|Closure|null $navigationLabel = null;

    protected string|Closure|null $navigationGroup = null;

    protected string|Closure|null $navigationIcon = 'heart-pulse';

    protected int|Closure|null $navigationSort = null;

    protected bool|Closure $shouldRegisterNavigation = true;

    public static function make(): static
    {
        return new static;
    }

    /**
     * The plugin registered on the current panel, or one with the default options when the
     * panel doesn't have it (a page or widget registered by hand).
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
        $panel->pages([$this->getPage()]);

        if ($this->hasDashboardWidget) {
            $panel->widgets([$this->widget]);
        }
    }

    public function boot(Panel $panel): void {}

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
            default => [],
        };
    }

    // ---------------------------------------------------------------- Page and widget

    /**
     * Replace the page with your own subclass of `Health`.
     *
     * @param  class-string<Health>  $page
     */
    public function usingPage(string $page): static
    {
        if (! is_a($page, Health::class, true)) {
            throw new InvalidArgumentException("The health page [{$page}] must extend [".Health::class.'].');
        }

        $this->page = $page;

        return $this;
    }

    /**
     * @return class-string<Health>
     */
    public function getPage(): string
    {
        return $this->page;
    }

    /**
     * Add the `HealthStatusWidget` (or your subclass of it) to the panel's dashboard: a card
     * summarising failing checks that links to the health page.
     *
     * @param  class-string<HealthStatusWidget>|null  $widget
     */
    public function dashboardWidget(bool $condition = true, ?string $widget = null): static
    {
        $this->hasDashboardWidget = $condition;
        $this->widget = $widget ?? $this->widget;

        return $this;
    }

    public function hasDashboardWidget(): bool
    {
        return $this->hasDashboardWidget;
    }

    /**
     * @return class-string<HealthStatusWidget>
     */
    public function getWidget(): string
    {
        return $this->widget;
    }

    /**
     * How often the results refresh on the page and the widget (`'30s'`), or null to turn
     * polling off. Polling only reads the stored results; it never runs the checks.
     */
    public function usingPollingInterval(?string $interval): static
    {
        $this->pollingInterval = $interval;

        return $this;
    }

    public function getPollingInterval(): ?string
    {
        return $this->pollingInterval;
    }

    /**
     * Send spatie/laravel-health's notifications when the checks run from the "refresh"
     * action (off by default: `health:check --no-notification`).
     */
    public function notifyOnRefresh(bool $condition = true): static
    {
        $this->sendsNotificationsOnRefresh = $condition;

        return $this;
    }

    public function sendsNotificationsOnRefresh(): bool
    {
        return $this->sendsNotificationsOnRefresh;
    }

    /**
     * Who may open the page, refresh the checks and see the widget. Without it every user
     * of the panel may.
     */
    public function authorize(bool|Closure|null $callback = true): static
    {
        $this->authorizeUsing = $callback;

        return $this;
    }

    public function isAuthorized(): bool
    {
        return $this->authorizeUsing === null || $this->evaluateUserAuthorization($this->authorizeUsing);
    }

    // ---------------------------------------------------------------- Navigation

    public function navigationLabel(string|Closure|null $label): static
    {
        $this->navigationLabel = $label;

        return $this;
    }

    public function getNavigationLabel(): string
    {
        return (string) ($this->evaluate($this->navigationLabel) ?? __('alfakit-health::health.page.navigation_label'));
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

    public function registerNavigation(bool|Closure $condition = true): static
    {
        $this->shouldRegisterNavigation = $condition;

        return $this;
    }

    public function shouldRegisterNavigation(): bool
    {
        return (bool) $this->evaluate($this->shouldRegisterNavigation);
    }
}
