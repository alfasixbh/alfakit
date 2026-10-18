<?php

declare(strict_types=1);

namespace App\Alfakit\Tenancy;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Pages\Page;
use AlfaSix\Alfakit\Schemas\Components\Callout;
use AlfaSix\Alfakit\Schemas\Components\Grid;
use AlfaSix\Alfakit\Schemas\Components\Placeholder;
use AlfaSix\Alfakit\Schemas\Components\Section;
use AlfaSix\Alfakit\Schemas\Components\UnorderedList;
use AlfaSix\Alfakit\Schemas\Schema;
use App\Models\Store;

/**
 * The page behind the tenant menu's "Billing" entry. It is the action of the panel's
 * `tenant.billing` route (see DemoBillingProvider), so it is not discovered as a page and
 * answers to that route name instead of `pages.billing`.
 */
class Billing extends Page
{
    protected static bool $shouldRegisterNavigation = false;

    protected static ?string $slug = 'billing';

    protected static ?string $navigationIcon = 'demo::billing';

    public static function getRelativeRouteName(): string
    {
        return 'tenant.billing';
    }

    public function getTitle(): string
    {
        return __('platform.tenancy.billing.title');
    }

    public function getSubheading(): ?string
    {
        return __('platform.tenancy.billing.description');
    }

    public function content(Schema $schema): Schema
    {
        $tenant = alfakit()->getTenant();
        $store = $tenant instanceof Store ? $tenant->name : '';

        $plan = request()->query('plan');

        return $schema->components([
            // alfasix/alfakit-billing: a plan picked on the plans page lands here.
            Callout::make(__('plugins.billing.checkout_disabled'))
                ->description(__('plugins.billing.checkout_disabled_body', ['plan' => is_string($plan) ? ucfirst($plan) : '']))
                ->warning()
                ->icon('credit-card')
                ->visible(is_string($plan) && $plan !== ''),
            Callout::make(__('plugins.billing.compare_plans'))
                ->description(__('plugins.billing.compare_plans_body'))
                ->info()
                ->icon('sparkles')
                ->footer([
                    Action::make('plans')
                        ->label(__('plugins.billing.see_plans'))
                        ->url(fn (): string => alfakit()->getCurrentOrDefaultPanel()->getTenantBillingUrl().'/plans'),
                ]),
            Grid::make(['default' => 1, '@lg' => 2])->schema([
                Section::make(__('platform.tenancy.billing.plan'))
                    ->description(__('platform.tenancy.billing.plan_includes'))
                    ->icon('demo::billing')
                    ->schema([
                        Placeholder::make('plan')
                            ->label(__('platform.tenancy.billing.plan_name'))
                            ->content(__('platform.tenancy.billing.plan_price')),
                        UnorderedList::make([
                            __('platform.tenancy.billing.features.stores'),
                            __('platform.tenancy.billing.features.renderers'),
                            __('platform.tenancy.billing.features.reset'),
                        ])->size('sm'),
                    ]),
                Section::make(__('platform.tenancy.billing.subscription'))
                    ->icon('shield-check')
                    ->schema([
                        Callout::make($store)
                            ->description(__('platform.tenancy.billing.subscription_description'))
                            ->info()
                            ->icon('info'),
                    ]),
            ]),
            Section::make(__('platform.tenancy.billing.invoices'))
                ->icon('receipt')
                ->schema([
                    Callout::make(__('platform.tenancy.billing.empty'))
                        ->success()
                        ->icon('badge-check'),
                ]),
        ]);
    }
}
