<?php

declare(strict_types=1);

namespace App\Alfakit\Showcase\Blocks;

use AlfaSix\Alfakit\Forms\Components\RichEditor\RichContentCustomBlock;

/** Showcase: a custom block without a configuration form (inserted as is). */
class DividerBlock extends RichContentCustomBlock
{
    public static function getLabel(): string
    {
        return __('playground.showcase.editors.divider');
    }

    public static function getIcon(): ?string
    {
        return 'minus';
    }

    public static function toPreviewHtml(array $config): string
    {
        return '<hr>';
    }
}
