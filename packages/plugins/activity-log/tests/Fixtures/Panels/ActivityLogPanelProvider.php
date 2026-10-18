<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitActivityLog\Tests\Fixtures\Panels;

use AlfaSix\Alfakit\Panel;
use AlfaSix\Alfakit\PanelProvider;
use AlfaSix\AlfakitActivityLog\ActivityLogPlugin;
use AlfaSix\AlfakitActivityLog\Tests\Fixtures\Resources\ArticleResource;
use AlfaSix\AlfakitActivityLog\Tests\Fixtures\Resources\NoteResource;

class ActivityLogPanelProvider extends PanelProvider
{
    public function panel(Panel $panel): Panel
    {
        return $panel
            ->id('activity')
            ->path('activity')
            ->login()
            ->middleware(['web'])
            ->resources([ArticleResource::class, NoteResource::class])
            ->plugin(ActivityLogPlugin::make()->navigationGroup('Audit')->navigationSort(5)->logActions());
    }
}
