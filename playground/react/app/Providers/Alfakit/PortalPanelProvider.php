<?php

declare(strict_types=1);

namespace App\Providers\Alfakit;

use AlfaSix\Alfakit\Pages\Dashboard;
use AlfaSix\Alfakit\Panel;
use AlfaSix\Alfakit\PanelProvider;
use App\Alfakit\Portal\Resources\OrderResource;
use App\Alfakit\Portal\Widgets\OrderStats;

/**
 * A customer portal (/portal) built with the `portal()` preset: top navigation without
 * admin chrome, a branded sign-in, invitation-only registration and every resource scoped
 * to the signed-in customer (`scopeToUser('user_id')`). Sign in as customer@example.com /
 * password. Invite someone with `Alfakit::getPanel('portal')->inviteToRegister($email)`.
 */
class PortalPanelProvider extends PanelProvider
{
    public function panel(Panel $panel): Panel
    {
        return $panel
            ->id('portal')
            ->path('portal')
            ->portal()
            ->brandName(fn (): string => __('playground.portal.brand'))
            ->favicon('/icons/favicon.svg')
            ->colors(['primary' => '#ea580c'])
            ->theme('alfakit')
            ->locales(['en', 'ar', 'de', 'es', 'fa', 'fr', 'it', 'ja', 'nl', 'pt_BR', 'ru', 'tr', 'zh_CN'])
            ->invitationOnlyRegistration()
            ->scopeToUser('user_id')
            ->resources([OrderResource::class])
            ->pages([Dashboard::class])
            ->widgets([OrderStats::class])
            ->middleware(['web']);
    }
}
