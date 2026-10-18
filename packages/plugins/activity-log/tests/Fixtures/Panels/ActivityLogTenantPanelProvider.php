<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitActivityLog\Tests\Fixtures\Panels;

use AlfaSix\Alfakit\Panel;
use AlfaSix\Alfakit\PanelProvider;
use AlfaSix\Alfakit\Tests\Fixtures\Models\Team;
use AlfaSix\AlfakitActivityLog\ActivityLogPlugin;
use AlfaSix\AlfakitActivityLog\Tests\Fixtures\Resources\ArticleResource;

class ActivityLogTenantPanelProvider extends PanelProvider
{
    public function panel(Panel $panel): Panel
    {
        return $panel
            ->id('activity-team')
            ->path('activity-team')
            ->login()
            ->middleware(['web'])
            ->tenant(Team::class, slugAttribute: 'slug')
            ->resources([ArticleResource::class])
            ->plugin(ActivityLogPlugin::make());
    }
}
