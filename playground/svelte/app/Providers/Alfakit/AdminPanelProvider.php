<?php

declare(strict_types=1);

namespace App\Providers\Alfakit;

use AlfaSix\Alfakit\CommandPalette\Command;
use AlfaSix\Alfakit\Navigation\NavigationItem;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Pages\Dashboard;
use AlfaSix\Alfakit\Pages\MailPreview;
use AlfaSix\Alfakit\Panel;
use AlfaSix\Alfakit\PanelProvider;
use AlfaSix\Alfakit\Theming\Slot;
use AlfaSix\Alfakit\Theming\Themes;
use AlfaSix\AlfakitActivityLog\ActivityLogPlugin;
use AlfaSix\AlfakitAi\AiPlugin;
use AlfaSix\AlfakitAnalytics\Analytics;
use AlfaSix\AlfakitAnalytics\AnalyticsPlugin;
use AlfaSix\AlfakitApi\ApiPlugin;
use AlfaSix\AlfakitApi\ResourceApi;
use AlfaSix\AlfakitBackup\BackupPlugin;
use AlfaSix\AlfakitBilling\BillingPlugin;
use AlfaSix\AlfakitBilling\Plan;
use AlfaSix\AlfakitBilling\Providers\StripeBillingProvider;
use AlfaSix\AlfakitCalendar\CalendarPlugin;
use AlfaSix\AlfakitCms\CmsPlugin;
use AlfaSix\AlfakitComments\CommentsPlugin;
use AlfaSix\AlfakitFeatureFlags\FeatureFlagsPlugin;
use AlfaSix\AlfakitFileManager\FileManagerPlugin;
use AlfaSix\AlfakitForms\FormsPlugin;
use AlfaSix\AlfakitHealth\HealthPlugin;
use AlfaSix\AlfakitHelpdesk\HelpdeskPlugin;
use AlfaSix\AlfakitInvoices\InvoicesPlugin;
use AlfaSix\AlfakitKanban\KanbanPlugin;
use AlfaSix\AlfakitMailTemplates\MailTemplatesPlugin;
use AlfaSix\AlfakitMediaLibrary\MediaLibraryPlugin;
use AlfaSix\AlfakitOps\OpsPlugin;
use AlfaSix\AlfakitSettings\SettingsPlugin;
use AlfaSix\AlfakitShield\ShieldPlugin;
use AlfaSix\AlfakitTags\TagsPlugin;
use AlfaSix\AlfakitTranslationManager\TranslationManagerPlugin;
use AlfaSix\AlfakitTree\TreePlugin;
use AlfaSix\AlfakitWebhooks\WebhooksPlugin;
use AlfaSix\AlfakitWorkflows\WorkflowsPlugin;
use App\Alfakit\Plugins\Pages\Calendar;
use App\Alfakit\Plugins\Pages\ManageGeneralSettings;
use App\Alfakit\Resources\CategoryResource;
use App\Alfakit\Resources\PostResource;
use App\Alfakit\Widgets\BlogStats;
use App\Models\Post;
use App\Models\User;
use Illuminate\Support\Facades\Artisan;

class AdminPanelProvider extends PanelProvider
{
    // Wave 2: kanban, forms, cms, api, webhooks, ops, feature flags, translations, ai, workflows,
    // invoices, file manager, helpdesk and analytics (registered with php artisan alfakit:add).

    public function panel(Panel $panel): Panel
    {
        return $panel
            ->default()
            ->id('admin')
            ->path('admin')
            ->login()
            // Navigation badge counts load after the page, so they never slow down a visit.
            ->deferNavigationBadges()
            ->passwordReset()
            ->profile()
            ->discoverResources(in: app_path('Alfakit/Resources'), for: 'App\\Alfakit\\Resources')
            ->discoverPages(in: app_path('Alfakit/Pages'), for: 'App\\Alfakit\\Pages')
            // Feature showcase pages (copied from playground/react; see its Showcase namespace).
            ->discoverClusters(in: app_path('Alfakit/Showcase/Clusters'), for: 'App\\Alfakit\\Showcase\\Clusters')
            ->discoverPages(in: app_path('Alfakit/Showcase/Pages'), for: 'App\\Alfakit\\Showcase\\Pages')
            ->pages([
                Dashboard::class,
                // Every AlfaKit email with sample data, light/dark and LTR/RTL (local/debug only).
                MailPreview::class,
                Calendar::class,
            ])
            ->navigationItems([
                NavigationItem::make(fn (): string => __('playground.nav.posts_board'))
                    // A fixed key: the label changes with the language.
                    ->key('posts-board')
                    ->icon('square-kanban')
                    ->group(fn (): string => __('playground.nav.groups.blog'))
                    ->sort(5)
                    ->url(fn (): string => PostResource::getUrl('board'))
                    ->isActiveWhen(fn (): bool => request()->is('admin/posts/board')),
                NavigationItem::make(fn (): string => __('playground.nav.category_tree'))
                    // A fixed key: the label changes with the language.
                    ->key('category-tree')
                    ->icon('list-tree')
                    ->group(fn (): string => __('playground.nav.groups.blog'))
                    ->sort(20)
                    ->url(fn (): string => CategoryResource::getUrl('tree'))
                    ->isActiveWhen(fn (): bool => request()->is('admin/categories/tree')),
            ])
            ->discoverWidgets(in: app_path('Alfakit/Widgets'), for: 'App\\Alfakit\\Widgets')
            ->widgets([
                BlogStats::class,
            ])
            ->middleware([
                'web',
            ])
            ->databaseNotifications()
            // Installable app with Web Push (VAPID keys from `php artisan alfakit:pwa-keys`).
            ->pwa(push: true, themeColor: 'oklch(0.359 0.116 256.3)')
            // No Reverb in the playgrounds (BROADCAST_CONNECTION=log), so realtimeNotifications() stays off.
            // Edit dashboard: drag, resize and hide widgets, saved per user.
            ->customizableDashboards()
            // Command palette (Cmd/Ctrl+K) commands.
            ->commands([
                Command::make('write-post')
                    ->label(fn (): string => __('playground.commands.write_post'))
                    ->icon('pen-line')
                    ->group(fn (): string => __('playground.commands.group'))
                    ->keywords(['new', 'create', 'blog'])
                    ->shortcut('g n')
                    ->url(fn (): string => PostResource::getUrl('create')),
                Command::make('posts-board')
                    ->label(fn (): string => __('playground.commands.posts_board'))
                    ->icon('square-kanban')
                    ->group(fn (): string => __('playground.commands.group'))
                    ->url(fn (): string => PostResource::getUrl('board')),
                Command::make('open-site')
                    ->label(fn (): string => __('playground.commands.open_site'))
                    ->icon('globe')
                    ->group(fn (): string => __('playground.commands.group'))
                    ->url('/site', shouldOpenInNewTab: true),
                Command::make('clear-view-cache')
                    ->label(fn (): string => __('playground.commands.clear_view_cache'))
                    ->icon('trash')
                    ->group(fn (): string => __('playground.commands.maintenance'))
                    ->keywords(['cache', 'flush'])
                    ->description(fn (): string => __('playground.commands.clear_view_cache_description'))
                    ->requiresConfirmation()
                    ->visible(fn (): bool => auth()->user()?->hasRole('super_admin') ?? false)
                    ->action(function (): void {
                        Artisan::call('view:clear');
                        Notification::make()->title(__('playground.commands.view_cache_cleared'))->success()->send();
                    }),
            ])
            // Schema inspector button, local environment only.
            ->devTools(fn (): bool => app()->isLocal())
            // alfasix/alfakit-analytics: the tracking snippet on the public CMS pages only.
            ->slot(Slot::HEAD_END, fn () => request()->routeIs('alfakit-cms.page') ? Analytics::script('playground-site') : null)
            // First-party plugins (packages/plugins). Admin pages live in the System group.
            ->plugins([
                ShieldPlugin::make()->navigationGroup(fn (): string => __('playground.nav.groups.system'))->navigationSort(10),
                ActivityLogPlugin::make()->navigationGroup(fn (): string => __('playground.nav.groups.system'))->navigationSort(20)->navigationCountBadge(),
                BackupPlugin::make()->navigationGroup(fn (): string => __('playground.nav.groups.system'))->navigationSort(30),
                HealthPlugin::make()->navigationGroup(fn (): string => __('playground.nav.groups.system'))->navigationSort(40)->dashboardWidget(),
                SettingsPlugin::make()->pages([ManageGeneralSettings::class])->navigationGroup(fn (): string => __('playground.nav.groups.system')),
                MailTemplatesPlugin::make()->authorize()->navigationGroup(fn (): string => __('playground.nav.groups.system'))->navigationSort(45),
                // Billing for the signed-in user (no tenancy): plans page at /admin/billing/plans and a
                // Billing user menu entry. No subscription is required and no Stripe keys are set, so
                // checkout only works once STRIPE_KEY / STRIPE_SECRET and real price ids exist.
                BillingPlugin::make()
                    ->provider(StripeBillingProvider::make()->plans([
                        Plan::make('starter')->price('price_starter_placeholder')->amount(9, 'usd')->monthly()
                            ->description(fn (): string => __('playground.billing.starter_description'))
                            ->features(fn (): array => __('playground.billing.starter_features')),
                        Plan::make('pro')->label('Pro')->price('price_pro_placeholder')->amount(29, 'usd')->monthly()
                            ->description(fn (): string => __('playground.billing.pro_description'))
                            ->features(fn (): array => __('playground.billing.pro_features'))
                            ->highlighted(),
                        Plan::make('enterprise')->price('price_enterprise_placeholder')->priceLabel(fn (): string => __('playground.billing.enterprise_price'))
                            ->features(fn (): array => __('playground.billing.enterprise_features')),
                    ])->trialDays(14))
                    ->requiresSubscription(false),
                CalendarPlugin::make()->editable()->selectable(),
                TreePlugin::make(),
                CommentsPlugin::make()->mentionableSearchColumns(['name', 'email']),
                TagsPlugin::make(),
                MediaLibraryPlugin::make(),
                // Wave 2 first-party plugins.
                KanbanPlugin::make(),
                FormsPlugin::make()->navigationGroup(fn (): string => __('playground.nav.groups.content'))->navigationSort(20),
                // Public site under /site (the app keeps /), "Edit this page" bar for editors,
                // read-only JSON API at /api/cms. Pages render with the panel's renderer.
                CmsPlugin::make()
                    ->siteName('AlfaKit Playground')
                    ->publicRoutes(prefix: 'site')
                    ->rootView('alfakit::app')
                    ->adminBar()
                    ->api(),
                ApiPlugin::make()
                    ->resources([
                        ResourceApi::make(PostResource::class)
                            ->readOnly()
                            ->fields(['id', 'title', 'slug', 'excerpt', 'status', 'is_featured', 'views', 'published_at'])
                            ->includes(['author' => ['id', 'name'], 'category' => ['id', 'name']]),
                    ])
                    ->navigationGroup(fn (): string => __('playground.nav.groups.developers')),
                WebhooksPlugin::make()
                    ->events(['post.published' => ['label' => 'Post published', 'description' => 'A post went live.']])
                    ->modelEvents([Post::class])
                    ->allowInsecureUrls(app()->isLocal())
                    ->navigationGroup(fn (): string => __('playground.nav.groups.developers'))
                    ->authorize(fn (User $user): bool => $user->hasRole('super_admin')),
                OpsPlugin::make()
                    ->authorize(fn (User $user): bool => $user->hasRole('super_admin'))
                    ->navigationGroup(fn (): string => __('playground.nav.groups.system')),
                FeatureFlagsPlugin::make()
                    ->authorize(fn (User $user): bool => $user->hasRole('super_admin'))
                    ->discoverFeatures()
                    ->navigationGroup(fn (): string => __('playground.nav.groups.system')),
                TranslationManagerPlugin::make()
                    ->authorize(fn (User $user): bool => $user->hasRole('super_admin'))
                    ->editableLocales(['ar', 'fr', 'de', 'ja'])
                    ->navigationGroup(fn (): string => __('playground.nav.groups.system')),
                // Copilot and MCP stay off: they need a provider key (php artisan alfakit:ai-setup).
                AiPlugin::make()->streaming()->navigationGroup(fn (): string => __('playground.nav.groups.system')),
                WorkflowsPlugin::make()->navigationGroup(fn (): string => __('playground.nav.groups.work')),
                InvoicesPlugin::make()
                    ->customers(fn () => User::query(), titleAttribute: 'name', searchColumns: ['name', 'email'])
                    ->seller(['name' => 'AlfaKit Playground W.L.L.', 'address' => 'Manama, Bahrain', 'email' => 'billing@example.com', 'tax_id' => 'VAT-200100'])
                    ->dashboardWidgets(),
                FileManagerPlugin::make()->disks(['public'])->root('playground-files'),
                HelpdeskPlugin::make()->navigationGroup(fn (): string => __('playground.nav.groups.support')),
                AnalyticsPlugin::make()
                    ->authorize(fn (User $user): bool => $user->hasRole('super_admin'))
                    ->navigationGroup(fn (): string => __('playground.nav.groups.marketing')),
            ])
            ->locales(['en', 'ar', 'de', 'es', 'fa', 'fr', 'it', 'ja', 'nl', 'pt_BR', 'ru', 'tr', 'zh_CN'])
            ->languageSwitcher('both')
            // The playground's own strings (lang/<locale>/playground.php); the custom components in
            // resources/js/alfakit read the `frontend` part with t('playground.…').
            ->frontendTranslations(['playground' => 'playground.frontend'])
            // Design: pick any built-in theme (neutral, alfakit, minimal, soft, corporate,
            // filament). The playground lets you switch from the top bar.
            ->brandName('AlfaKit')
            ->brandLogo('/brand/alfakit-wordmark-color.svg')
            ->darkModeBrandLogo('/brand/alfakit-wordmark-reverse.svg')
            ->brandLogoHeight('2.25rem')
            ->favicon('/icons/favicon.svg')
            ->theme(fn (): string => session('demo_theme', 'alfakit'))
            ->slot(Slot::TOPBAR_END, fn () => view('alfakit.theme-picker', [
                'themes' => Themes::all(),
                'current' => session('demo_theme', 'alfakit'),
            ]));
    }
}
