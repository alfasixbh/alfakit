<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitMailTemplates;

use AlfaSix\Alfakit\Contracts\Plugin;
use AlfaSix\Alfakit\Panel;
use AlfaSix\Alfakit\Support\Concerns\EvaluatesClosures;
use AlfaSix\AlfakitMailTemplates\Resources\MailTemplateResource;
use Closure;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Support\Facades\Gate;
use InvalidArgumentException;

/**
 * Editable mail templates: a "Mail templates" resource where admins edit the subject and
 * body of every editable mail (`MailDefinition::editable()`) per locale.
 *
 * ```php
 * $panel->plugin(
 *     MailTemplatesPlugin::make()
 *         ->authorize(fn (User $user): bool => $user->is_admin)
 *         ->locales(['en', 'ar'])
 *         ->navigationGroup('Settings'),
 * );
 * ```
 *
 * Without `authorize()`, only users the `manageAlfakitMailTemplates` gate allows see it.
 */
class MailTemplatesPlugin implements Plugin
{
    use EvaluatesClosures;

    public const ID = 'mail-templates';

    public const GATE = 'manageAlfakitMailTemplates';

    protected bool|Closure|null $authorizeUsing = null;

    protected string $gate = self::GATE;

    /** @var array<int|string, string>|Closure|null */
    protected array|Closure|null $locales = null;

    protected string|Closure|null $navigationGroup = null;

    protected int|Closure|null $navigationSort = null;

    protected string|Closure|null $navigationIcon = 'mail';

    /** @var class-string<MailTemplateResource> */
    protected string $resource = MailTemplateResource::class;

    public static function make(): static
    {
        return new static;
    }

    /**
     * The plugin registered on the current panel, or one with the default options.
     */
    public static function get(): static
    {
        $panel = alfakit()->getCurrentPanel() ?? alfakit()->getDefaultPanel();

        if ($panel !== null && $panel->hasPlugin(self::ID)) {
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
        $panel->resources([$this->resource]);
    }

    public function boot(Panel $panel): void {}

    // ---------------------------------------------------------------- Authorisation

    /**
     * Who may edit templates: `fn (User $user): bool` (or a boolean). Without it, users the
     * `manageAlfakitMailTemplates` gate (see `gate()`) allows; guests never may.
     */
    public function authorize(bool|Closure|null $callback = true): static
    {
        $this->authorizeUsing = $callback;

        return $this;
    }

    /**
     * The gate checked when no `authorize()` callback is set.
     */
    public function gate(string $ability): static
    {
        $this->gate = $ability;

        return $this;
    }

    public function getGate(): string
    {
        return $this->gate;
    }

    public function getUser(): ?Authenticatable
    {
        return alfakit()->getCurrentOrDefaultPanel()->auth()->user();
    }

    public function isAuthorized(): bool
    {
        $user = $this->getUser();

        if ($user === null) {
            return false;
        }

        if ($this->authorizeUsing !== null) {
            return (bool) $this->evaluate($this->authorizeUsing);
        }

        return Gate::forUser($user)->allows($this->gate);
    }

    // ---------------------------------------------------------------- Options

    /**
     * The locales templates are written in: `['en', 'ar']` or `['en' => 'English']`. By
     * default the panel's locales.
     *
     * @param  array<int|string, string>|Closure|null  $locales
     */
    public function locales(array|Closure|null $locales): static
    {
        $this->locales = $locales;

        return $this;
    }

    /**
     * @return array<string, string> code => label
     */
    public function getLocales(): array
    {
        $configured = $this->evaluate($this->locales);

        if (is_array($configured) && $configured !== []) {
            $locales = [];

            foreach ($configured as $code => $label) {
                is_string($code)
                    ? $locales[$code] = (string) $label
                    : $locales[(string) $label] = \AlfaSix\Alfakit\Localization\Locale::make((string) $label)->getLabel();
            }

            return $locales;
        }

        $locales = [];

        foreach (alfakit()->getCurrentOrDefaultPanel()->getLocales() as $code => $locale) {
            $locales[$code] = $locale->getLabel();
        }

        return $locales;
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

    /**
     * Use your own resource (a subclass of `MailTemplateResource`).
     *
     * @param  class-string<MailTemplateResource>  $resource
     */
    public function usingResource(string $resource): static
    {
        if (! is_a($resource, MailTemplateResource::class, true)) {
            throw new InvalidArgumentException("The resource [{$resource}] must extend [".MailTemplateResource::class.'].');
        }

        $this->resource = $resource;

        return $this;
    }

    /**
     * @return class-string<MailTemplateResource>
     */
    public function getResource(): string
    {
        return $this->resource;
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
            'user' => [$this->getUser()],
            default => [],
        };
    }
}
