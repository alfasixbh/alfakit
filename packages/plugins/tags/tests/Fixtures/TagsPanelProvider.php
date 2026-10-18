<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitTags\Tests\Fixtures;

use AlfaSix\Alfakit\Panel;
use AlfaSix\Alfakit\PanelProvider;
use AlfaSix\AlfakitTags\TagsPlugin;

class TagsPanelProvider extends PanelProvider
{
    public function panel(Panel $panel): Panel
    {
        return $panel
            ->id('tags')
            ->path('tags')
            ->login()
            ->middleware(['web'])
            ->resources([ArticleResource::class])
            ->plugin(TagsPlugin::make());
    }
}
