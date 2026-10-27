<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitBackup;

use AlfaSix\Alfakit\Contracts\Plugin;
use AlfaSix\Alfakit\Panel;
use AlfaSix\Alfakit\Support\Concerns\EvaluatesClosures;
use AlfaSix\AlfakitBackup\Pages\Backups;
use Closure;
use InvalidArgumentException;

/**
 * Manage spatie/laravel-backup backups from a panel: list them per disk with their
 * destination's health, create one in the background, download and delete.
 *
 * ```php
 * $panel->plugin(
 *     BackupPlugin::make()
 *         ->usingQueue('backups')
 *         ->authorize(fn (User $user): bool => $user->is_admin),
 * );
 * ```
 */
class BackupPlugin implements Plugin
{
    use EvaluatesClosures;

    public const ID = 'backup';

    /** @var class-string<Backups> */
    protected string $page = Backups::class;

    protected ?string $queue = null;

    protected ?string $connection = null;

    protected ?int $timeout = null;

    protected ?string $pollingInterval = '4s';

    protected int $downloadLinkLifetime = 5;

    protected bool|Closure|null $authorizeUsing = null;

    protected string|Closure|null $navigationLabel = null;

    protected string|Closure|null $navigationGroup = null;

    protected string|Closure|null $navigationIcon = 'archive';

    protected int|Closure|null $navigationSort = null;

    protected bool|Closure $shouldRegisterNavigation = true;

    public static function make(): static
    {
        return new static;
    }

    /**
     * The plugin registered on the current panel, or one with the default options when the
     * panel doesn't have it (a page registered by hand).
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

    // ---------------------------------------------------------------- Page

    /**
     * Replace the page with your own subclass of `Backups`.
     *
     * @param  class-string<Backups>  $page
     */
    public function usingPage(string $page): static
    {
        if (! is_a($page, Backups::class, true)) {
            throw new InvalidArgumentException("The backups page [{$page}] must extend [".Backups::class.'].');
        }

        $this->page = $page;

        return $this;
    }

    /**
     * @return class-string<Backups>
     */
    public function getPage(): string
    {
        return $this->page;
    }

    // ---------------------------------------------------------------- Backup job

    /**
     * The queue (and connection) the "create backup" job is pushed to.
     */
    public function usingQueue(?string $queue, ?string $connection = null): static
    {
        $this->queue = $queue;
        $this->connection = $connection;

        return $this;
    }

    public function getQueue(): ?string
    {
        return $this->queue;
    }

    public function getConnection(): ?string
    {
        return $this->connection;
    }

    /**
     * Seconds the backup job may run (passed to the job and to `backup:run --timeout`).
     */
    public function timeout(?int $seconds): static
    {
        $this->timeout = $seconds;

        return $this;
    }

    /**
     * Let the backup job run as long as it needs (`set_time_limit(0)`).
     */
    public function noTimeout(): static
    {
        return $this->timeout(0);
    }

    public function getTimeout(): ?int
    {
        return $this->timeout;
    }

    // ---------------------------------------------------------------- Page behaviour

    /**
     * How often the list and the destinations refresh (`'10s'`), or null to turn polling off.
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
     * Minutes a signed download link stays valid.
     */
    public function downloadLinkLifetime(int $minutes): static
    {
        $this->downloadLinkLifetime = max(1, $minutes);

        return $this;
    }

    public function getDownloadLinkLifetime(): int
    {
        return $this->downloadLinkLifetime;
    }

    /**
     * Who may open the page, create, download and delete backups. Without it every user of
     * the panel may.
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
        return (string) ($this->evaluate($this->navigationLabel) ?? __('alfakit-backup::backup.page.navigation_label'));
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
