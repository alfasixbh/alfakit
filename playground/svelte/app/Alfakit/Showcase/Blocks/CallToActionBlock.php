<?php

declare(strict_types=1);

namespace App\Alfakit\Showcase\Blocks;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Forms\Components\RichEditor\RichContentCustomBlock;
use AlfaSix\Alfakit\Forms\Components\TextInput;

/** Showcase: a custom rich editor block with a configuration form. */
class CallToActionBlock extends RichContentCustomBlock
{
    public static function getLabel(): string
    {
        return __('playground.showcase.editors.call_to_action');
    }

    public static function getIcon(): ?string
    {
        return 'megaphone';
    }

    public static function configureEditorAction(Action $action): Action
    {
        return $action
            ->modalWidth('md')
            ->schema([
                TextInput::make('label')->label(__('playground.showcase.editors.call_to_action_label'))->required()->default(__('playground.showcase.editors.call_to_action_default')),
                TextInput::make('url')->label(__('playground.showcase.editors.call_to_action_url'))->url()->required()->default('https://alfakit.dev/docs'),
            ]);
    }

    public static function toPreviewHtml(array $config): string
    {
        return '<p><strong>'.e($config['label'] ?? '').'</strong> → '.e($config['url'] ?? '').'</p>';
    }

    public static function toHtml(array $config, array $data): string
    {
        return '<p><a href="'.e($config['url'] ?? '#').'"><strong>'.e($config['label'] ?? '').'</strong></a></p>';
    }
}
