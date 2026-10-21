<?php

declare(strict_types=1);

namespace App\Demo;

use AlfaSix\Alfakit\CommandPalette\Command;
use AlfaSix\Alfakit\Contracts\Plugin;
use AlfaSix\Alfakit\Panel;
use AlfaSix\AlfakitActivityLog\ActivityLogPlugin;
use AlfaSix\AlfakitAi\AiPlugin;
use AlfaSix\AlfakitAnalytics\AnalyticsPlugin;
use AlfaSix\AlfakitApi\ApiPlugin;
use AlfaSix\AlfakitApi\ResourceApi;
use AlfaSix\AlfakitBackup\BackupPlugin;
use AlfaSix\AlfakitBilling\BillingPlugin;
use AlfaSix\AlfakitBilling\Plan;
use AlfaSix\AlfakitCalendar\CalendarPlugin;
use AlfaSix\AlfakitCms\CmsPlugin;
use AlfaSix\AlfakitComments\CommentsPlugin;
use AlfaSix\AlfakitFeatureFlags\FeatureFlagsPlugin;
use AlfaSix\AlfakitFileManager\FileManagerPlugin;
use AlfaSix\AlfakitForms\FormsPlugin;
use AlfaSix\AlfakitHealth\HealthPlugin;
use AlfaSix\AlfakitHelpdesk\Enums\TicketPriority;
use AlfaSix\AlfakitHelpdesk\HelpdeskPlugin;
use AlfaSix\AlfakitHelpdesk\Sla\BusinessHours;
use AlfaSix\AlfakitHelpdesk\Sla\SlaPolicy;
use AlfaSix\AlfakitInvoices\InvoicesPlugin;
use AlfaSix\AlfakitKanban\KanbanPlugin;
use AlfaSix\AlfakitMailTemplates\MailTemplatesPlugin;
use AlfaSix\AlfakitMediaLibrary\MediaLibraryPlugin;
use AlfaSix\AlfakitOps\OpsPlugin;
use AlfaSix\AlfakitSettings\SettingsPlugin;
use AlfaSix\AlfakitShield\ShieldPlugin;
use AlfaSix\AlfakitTags\TagsPlugin;
use AlfaSix\AlfakitTeams\Permission;
use AlfaSix\AlfakitTeams\Role;
use AlfaSix\AlfakitTeams\TeamsPlugin;
use AlfaSix\AlfakitTranslationManager\TranslationManagerPlugin;
use AlfaSix\AlfakitTree\TreePlugin;
use AlfaSix\AlfakitWebhooks\WebhooksPlugin;
use AlfaSix\AlfakitWorkflows\WorkflowsPlugin;
use App\Alfakit\Billing\DemoPlansBillingProvider;
use App\Alfakit\Pages\Plugins\PromotionsCalendar;
use App\Alfakit\PluginPages\DemoBackups;
use App\Alfakit\PluginPages\ManageHouseSettings;
use App\Alfakit\Resources\CategoryResource;
use App\Alfakit\Resources\OrderResource;
use App\Alfakit\Resources\ProductResource;
use App\Alfakit\Resources\ReturnRequestResource;
use App\Alfakit\Tenancy\EditStore;
use App\Alfakit\Tenancy\RegisterStore;
use App\Enums\StaffRole;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Store;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

/**
 * The first-party plugins (packages/plugins/*) and the core power features of the three demo
 * panels, woven into the Maison Alfa story. Called once from DemoPanel::configure(), so the
 * React, Vue and Svelte panels stay identical.
 *
 * Public demo safety lives here too: no outbound mail (log mailer), webhooks never deliver
 * (a `null` queue connection and a read-only policy), Ops and backups are read-only, file
 * sharing is off, uploads are capped, AI answers locally (`demoResponses()`), translations
 * are per store and never written to files, and checkout never calls a payment provider.
 */
final class DemoPlugins
{
    /** Locales of the panels and the storefront: AlfaKit ships every one and lang/ translates the demo copy into each. */
    public const LOCALES = ['en', 'ar', 'fr', 'de', 'es', 'it', 'nl', 'pt_BR', 'ru', 'tr', 'fa', 'ja', 'zh_CN'];

    public static function configure(Panel $panel, string $renderer): Panel
    {
        return $panel
            ->locales(self::LOCALES)
            ->languageSwitcher('both')
            ->customizableDashboards()
            ->commands(self::commands())
            ->plugins(self::plugins($renderer))
            // The Teams plugin brings "Create team" and "Team settings"; the demo keeps its own
            // store sign-up and store profile pages (set after the plugin registered its pages).
            ->tenantRegistration(RegisterStore::class)
            ->tenantProfile(EditStore::class);
    }

    /** @return array<int, Command> */
    public static function commands(): array
    {
        $group = fn (): string => __('plugins.commands.group');

        return [
            Command::make('order-board')->label(fn (): string => __('plugins.commands.order_board'))->icon('square-kanban')->group($group)
                ->keywords(['kanban', 'fulfilment', 'orders'])->shortcut('g b')
                ->url(fn (): string => OrderResource::getUrl('board')),
            Command::make('promotions-calendar')->label(fn (): string => __('plugins.commands.calendar'))->icon('calendar-days')->group($group)
                ->keywords(['calendar', 'discounts', 'promotions', 'shipments'])->shortcut('g c')
                ->url(fn (): string => PromotionsCalendar::getUrl()),
            Command::make('returns')->label(fn (): string => __('plugins.commands.returns'))->icon('undo-2')->group($group)
                ->keywords(['refund', 'return', 'approval'])
                ->url(fn (): string => ReturnRequestResource::getUrl()),
            Command::make('category-tree')->label(fn (): string => __('plugins.commands.category_tree'))->icon('list-tree')->group($group)
                ->keywords(['categories', 'tree'])
                ->url(fn (): string => CategoryResource::getUrl('tree')),
            Command::make('new-product')->label(fn (): string => __('plugins.commands.new_product'))->icon('plus')->group($group)
                ->keywords(['create', 'perfume'])->shortcut('g n')
                ->url(fn (): string => ProductResource::getUrl('create')),
            Command::make('open-storefront')->label(fn (): string => __('plugins.commands.storefront'))->icon('store')->group($group)
                ->keywords(['shop', 'website'])
                ->url(fn (): string => '/'.Renderer::current(), shouldOpenInNewTab: true),
        ];
    }

    /** @return array<int, Plugin> */
    public static function plugins(string $renderer): array
    {
        $sales = fn (): string => Nav::group(Nav::SALES);
        $marketing = fn (): string => Nav::group(Nav::MARKETING);
        $support = fn (): string => Nav::group(Nav::SUPPORT);
        $content = fn (): string => Nav::group(Nav::CONTENT);
        $settings = fn (): string => Nav::group(Nav::SETTINGS);
        $system = fn (): string => Nav::group(Nav::SYSTEM);

        return [
            // Roles per store: owner, manager, support agent, viewer (seeded).
            ShieldPlugin::make()
                ->superAdmin(false)
                ->scopeToTenant()
                ->navigationGroup($settings)
                ->navigationSort(20),

            // Teams on the store tenancy: each store is a team (members, invitations, roles from
            // the store ladder). The panel keeps its own tenant(), store sign-up and profile pages.
            TeamsPlugin::make()
                ->teamModel(Store::class)
                ->configureTenancy(false)
                ->roles([
                    Role::make(StaffRole::Owner->value)->label(fn (): string => StaffRole::Owner->getLabel()),
                    Role::make(StaffRole::Manager->value)->label(fn (): string => StaffRole::Manager->getLabel())->color('success')
                        ->permissions([Permission::INVITE_MEMBERS, Permission::UPDATE_MEMBERS, Permission::REMOVE_MEMBERS, 'read', 'create', 'update', 'delete']),
                    Role::make(StaffRole::Staff->value)->label(fn (): string => StaffRole::Staff->getLabel())->color('info')
                        ->permissions(['read', 'create', 'update']),
                ])
                ->defaultRole(StaffRole::Staff->value)
                ->membersNavigation(group: $settings),

            ActivityLogPlugin::make()
                ->authorize(fn (?User $user): bool => Access::managers($user))
                ->logActions()
                ->navigationGroup($settings)
                ->navigationSort(40),

            TagsPlugin::make(),
            MediaLibraryPlugin::make(),
            TreePlugin::make(),
            KanbanPlugin::make(),
            CalendarPlugin::make()->editable()->selectable()->config(['dayMaxEvents' => true, 'nowIndicator' => true]),

            CommentsPlugin::make()
                ->mentionableSearchColumns(['name', 'email'])
                ->newestFirst()
                ->perPage(8),

            WorkflowsPlugin::make()
                ->navigationGroup($sales)
                ->navigationSort(16),

            InvoicesPlugin::make()
                ->authorize(fn (?User $user): bool => Access::managers($user))
                ->customers(fn (?Store $tenant): Builder => Customer::query()->when($tenant, fn (Builder $query) => $query->whereBelongsTo($tenant)), titleAttribute: 'email', searchColumns: ['first_name', 'last_name', 'email'])
                ->currency('USD')
                ->currencies(['USD'])
                ->seller(fn (?Store $tenant): array => [
                    'name' => ($tenant->name ?? 'Maison Alfa').' W.L.L.',
                    'address' => trim(($tenant->city ?? 'Manama').', '.($tenant->country ?? 'BH')),
                    'email' => 'billing@example.com',
                    'phone' => $tenant?->phone,
                    'tax_id' => 'VAT-'.str_pad((string) ($tenant->id ?? 1), 9, '2', STR_PAD_LEFT),
                ])
                ->defaultTerms(fn (): string => __('plugins.invoices.terms'))
                ->navigationGroup($sales)
                ->navigationSort(18),

            HelpdeskPlugin::make()
                ->authorize(fn (?User $user): bool => Access::support($user))
                ->publicTenant(fn (): ?Store => Shop::store())
                ->businessHours(BusinessHours::make('Asia/Bahrain')->days(['sun', 'mon', 'tue', 'wed', 'thu'], '09:00', '18:00'))
                ->slaPolicies([
                    SlaPolicy::make('urgent')->priorities([TicketPriority::Urgent, TicketPriority::High])->firstResponseWithin(60)->resolveWithin(8 * 60),
                    SlaPolicy::make('standard')->firstResponseWithin(4 * 60)->resolveWithin(3 * 9 * 60),
                ])
                ->chatGreeting(fn (): string => __('plugins.helpdesk.greeting'))
                ->navigationGroup($support)
                ->navigationSort(10),

            FormsPlugin::make()
                ->authorize(fn (?User $user): bool => Access::managers($user))
                ->navigationGroup($marketing)
                ->navigationSort(40),

            // Storefront pages live under /{renderer}/pages (routes/web.php renders them inside
            // each storefront layout); the prefix makes the panel's links point there.
            CmsPlugin::make()
                ->siteName(fn (): string => __('demo.storefront.title'))
                ->publicRoutes(false, prefix: "{$renderer}/pages")
                ->inertiaComponent('Storefront/CmsPage')
                ->resolveTenantUsing(fn (): ?Store => Shop::store())
                ->locales(['en' => 'English', 'ar' => 'العربية'], default: 'en')
                ->adminBar()
                ->disk('demo')
                ->directory('cms')
                ->authorize(fn (string $ability, string $model, mixed $record, mixed $user): bool => $ability === 'publish' ? Access::managers($user) : Access::support($user) || ($ability === 'viewAny' || $ability === 'view'))
                ->navigationGroup($content)
                ->navigationSort(10),

            FileManagerPlugin::make()
                ->disks(['demo'])
                ->root(fn (?Store $tenant): string => 'stores/'.($tenant->slug ?? 'shared').'/files')
                ->authorize(fn (?User $user): bool => Access::is($user, ...Access::ROLES))
                ->readOnly(fn (?User $user): bool => ! Access::managers($user))
                ->maxUploadSize(4096)
                ->acceptedFileTypes(['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain', 'text/csv'])
                ->shareLinks(false)
                ->publicLinks(false)
                ->navigationGroup($content)
                ->navigationSort(30),

            AnalyticsPlugin::make()
                ->authorize(fn (?User $user): bool => Access::managers($user))
                ->navigationGroup($marketing)
                ->navigationSort(5),

            FeatureFlagsPlugin::make()
                ->authorize(fn (?User $user): bool => Access::owner($user))
                ->discoverFeatures('App\\Features', app_path('Features'))
                ->navigationGroup($settings)
                ->navigationSort(60),

            TranslationManagerPlugin::make()
                ->authorize(fn (?User $user): bool => Access::owner($user))
                ->databaseOnly()
                ->tenantScoped()
                ->backups(false)
                // No AI provider in the public demo (the AI plugin answers with samples instead).
                ->aiTranslation(false)
                ->baseLocale('en')
                ->navigationGroup($settings)
                ->navigationSort(70),

            // Global (not per store) and owner only; "Send test" mails the signed-in owner, and
            // the demo's log mailer never delivers it.
            MailTemplatesPlugin::make()
                ->authorize(fn (?User $user): bool => Access::owner($user))
                ->locales(['en', 'ar', 'fr'])
                ->navigationGroup($settings)
                ->navigationSort(75),

            WebhooksPlugin::make()
                ->events([
                    'order.paid' => ['label' => 'Order paid', 'description' => 'A payment was captured for an order.'],
                    'order.shipped' => ['label' => 'Order shipped', 'description' => 'A shipment left the boutique.'],
                    'return.approved' => ['label' => 'Return approved', 'description' => 'A manager approved a return request.'],
                ])
                ->modelEvents([Order::class])
                // Never deliver from the public demo: the jobs go to a `null` connection.
                ->queue('webhooks', 'demo-null')
                ->navigationGroup($settings)
                ->navigationSort(80),

            ApiPlugin::make()
                ->resources([
                    ResourceApi::make(ProductResource::class)
                        ->readOnly()
                        ->fields(['id', 'sku', 'name', 'slug', 'price', 'compare_at_price', 'stock', 'status', 'featured', 'size_ml', 'published_at', 'updated_at'])
                        ->includes(['brand' => ['id', 'name'], 'category' => ['id', 'name']]),
                    ResourceApi::make(OrderResource::class)
                        ->readOnly()
                        ->fields(['id', 'number', 'status', 'channel', 'currency', 'subtotal', 'discount_total', 'tax_total', 'total', 'placed_at'])
                        ->includes(['customer' => ['id', 'first_name', 'last_name']]),
                ])
                ->canManageTokens(fn (?User $user): bool => Access::owner($user))
                ->tokenExpirationOptions([7, 30], default: 7)
                ->navigationGroup($settings)
                ->navigationSort(85),

            AiPlugin::make()
                // No provider key in the public demo: deterministic, local sample answers.
                ->demoResponses()
                // Answers appear as they are written (sample answers stream in chunks).
                ->streaming()
                ->setupHintVisible(fn (?User $user): bool => Access::owner($user))
                ->copilot()
                ->canViewAllUsage(fn (?User $user): bool => Access::owner($user))
                ->navigationGroup($settings)
                ->navigationSort(90),

            SettingsPlugin::make()
                ->pages([ManageHouseSettings::class])
                ->navigationGroup($settings),

            // Plans page beside the demo's own Billing page; checkout never calls Stripe.
            BillingPlugin::make()
                ->provider(DemoPlansBillingProvider::make()->plans([
                    Plan::make('boutique')->label('Boutique')->price('price_demo_boutique')->amount(29, 'usd')->monthly()
                        ->description(fn (): string => __('plugins.billing.plans.boutique'))
                        ->features(fn (): array => __('plugins.billing.features.boutique')),
                    Plan::make('maison')->label('Maison')->price('price_demo_maison')->amount(79, 'usd')->monthly()
                        ->description(fn (): string => __('plugins.billing.plans.maison'))
                        ->features(fn (): array => __('plugins.billing.features.maison'))
                        ->highlighted(),
                    Plan::make('enterprise')->label('Enterprise')->price('price_demo_enterprise')->priceLabel(fn (): string => __('plugins.billing.contact'))
                        ->description(fn (): string => __('plugins.billing.plans.enterprise'))
                        ->features(fn (): array => __('plugins.billing.features.enterprise')),
                ])->trialDays(14))
                ->requiresSubscription(false),

            // Owner only, and read-only: the public demo never runs maintenance from the browser.
            OpsPlugin::make()
                ->authorize(fn (?User $user): bool => Access::owner($user))
                ->allowOnTenantPanels()
                ->readOnly()
                ->logs(false)
                ->maintenance(false)
                ->navigationGroup($system)
                ->navigationSort(10),

            HealthPlugin::make()
                ->authorize(fn (?User $user): bool => Access::owner($user))
                ->navigationGroup($system)
                ->navigationSort(20),

            BackupPlugin::make()
                ->usingPage(DemoBackups::class)
                ->authorize(fn (?User $user): bool => Access::owner($user))
                ->navigationGroup($system)
                ->navigationSort(30),
        ];
    }
}
