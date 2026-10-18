<?php

declare(strict_types=1);

namespace App\Alfakit\Pages;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Pages\Page;
use AlfaSix\Alfakit\Schemas\Components\Callout;
use AlfaSix\Alfakit\Schemas\Components\Grid;
use AlfaSix\Alfakit\Schemas\Components\Html;
use AlfaSix\Alfakit\Schemas\Components\Section;
use AlfaSix\Alfakit\Schemas\Components\UnorderedList;
use AlfaSix\Alfakit\Schemas\Schema;
use App\Alfakit\Resources\StaffResource;
use App\Demo\Nav;
use App\Models\User;
use App\Providers\PlatformServiceProvider;
use Illuminate\Support\HtmlString;

/**
 * Showcase: the panel-wide options behind this demo (layout per role, MFA, impersonation,
 * transactions, error notifications, tenancy pages, icon aliases) and where each is set.
 */
class PlatformShowcase extends Page
{
    protected static ?string $navigationIcon = 'demo::security';

    protected static ?int $navigationSort = 90;

    protected static ?string $slug = 'showcase-platform';

    public static function getNavigationGroup(): ?string
    {
        return Nav::group(Nav::SHOWCASE);
    }

    public static function getNavigationLabel(): string
    {
        return __('platform.showcase.title');
    }

    public function getTitle(): string
    {
        return __('platform.showcase.title');
    }

    public function getSubheading(): ?string
    {
        return __('platform.showcase.description');
    }

    protected function getHeaderActions(): array
    {
        return [
            Action::make('profile')
                ->label(__('platform.showcase.open_profile'))
                ->icon('user-round-cog')
                ->color('gray')
                ->button()
                ->outlined()
                ->url(fn (): string => $this->getPanel()->getProfileUrl() ?? $this->getPanel()->getUrl()),
            Action::make('staff')
                ->label(__('platform.showcase.open_staff'))
                ->icon('demo::staff')
                ->color('gray')
                ->button()
                ->outlined()
                ->visible(fn (): bool => StaffResource::canViewAny())
                ->url(fn (): string => StaffResource::getUrl()),
            Action::make('error')
                ->label(__('platform.showcase.reliability.try_error'))
                ->icon('triangle-alert')
                ->color('danger')
                ->button()
                ->outlined()
                ->action(fn () => abort(403, __('platform.errors.demo_forbidden'))),
        ];
    }

    public function content(Schema $schema): Schema
    {
        $user = auth()->user();
        $role = $user instanceof User ? $user->roleIn() : null;
        $isSidebar = $this->getPanel()->getDesign()['layout'] !== 'topbar';

        return $schema->components([
            Callout::make(__('platform.showcase.layout.heading'))
                ->description(__('platform.showcase.layout.body').' '.__('platform.showcase.layout.you_are', [
                    'role' => $role?->getLabel() ?? '—',
                    'layout' => __($isSidebar ? 'platform.showcase.layout.sidebar' : 'platform.showcase.layout.topbar'),
                ]))
                ->info()
                ->icon('panel-left'),
            Grid::make(['default' => 1, '@lg' => 2])->schema([
                Section::make(__('platform.showcase.security.heading'))
                    ->icon('demo::security')
                    ->schema([
                        UnorderedList::make([
                            __('platform.showcase.security.mfa'),
                            __('platform.showcase.security.email_change'),
                            __('platform.showcase.security.impersonation'),
                            __('platform.showcase.security.policies'),
                        ])->size('sm'),
                    ]),
                Section::make(__('platform.showcase.reliability.heading'))
                    ->icon('database-zap')
                    ->schema([
                        UnorderedList::make([
                            __('platform.showcase.reliability.transactions'),
                            __('platform.showcase.reliability.errors'),
                            __('platform.showcase.reliability.rate_limits'),
                        ])->size('sm'),
                    ]),
                Section::make(__('platform.showcase.tenancy.heading'))
                    ->icon('demo::store')
                    ->schema([
                        UnorderedList::make([
                            __('platform.showcase.tenancy.registration'),
                            __('platform.showcase.tenancy.billing'),
                            __('platform.showcase.tenancy.notifications'),
                        ])->size('sm'),
                    ]),
                Section::make(__('platform.showcase.icons.heading'))
                    ->description(__('platform.showcase.icons.body'))
                    ->icon('demo::bottle')
                    ->schema([
                        Html::make(new HtmlString('<pre class="overflow-x-auto rounded-md bg-muted p-3 text-xs leading-relaxed" dir="ltr"><code>'.e(self::snippet()).'</code></pre>')),
                    ]),
            ]),
        ]);
    }

    private static function snippet(): string
    {
        $aliases = collect(PlatformServiceProvider::ICONS)
            ->take(4)
            ->map(fn (string $icon, string $alias): string => "    '{$alias}' => '{$icon}',")
            ->implode("\n");

        return <<<PHP
// app/Providers/PlatformServiceProvider.php
Icons::register([
{$aliases}
    // …
]);

// app/Demo/DemoPanel.php
\$panel
    ->design(layout: fn (?User \$user) => \$user?->isOwner() ? 'sidebar' : 'topbar')
    ->multiFactorAuthentication([AppAuthentication::make(), EmailAuthentication::make()])
    ->emailChangeVerification()
    ->tenantRegistration(RegisterStore::class)
    ->tenantProfile(EditStore::class)
    ->tenantBillingProvider(new DemoBillingProvider)
    ->databaseTransactions()
    ->errorNotifications()
    ->strictAuthorization(false);
PHP;
    }
}
