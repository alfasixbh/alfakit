<?php

declare(strict_types=1);

namespace App\Alfakit\RichContent;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Forms\Components\RichEditor\RichContentCustomBlock;
use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Forms\Components\Textarea;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use App\Demo\Catalog;

/**
 * A rich-editor block that highlights one ingredient inside the product description:
 * "Cambodian oud — aged for six years in Pursat." Configured in a modal, previewed inline.
 */
class NoteCalloutBlock extends RichContentCustomBlock
{
    public static function getId(): string
    {
        return 'note-callout';
    }

    public static function getLabel(): string
    {
        return __('catalog.rich_blocks.note_callout');
    }

    public static function getIcon(): ?string
    {
        return 'leaf';
    }

    public static function configureEditorAction(Action $action): Action
    {
        return $action
            ->modalHeading(fn (): string => __('catalog.rich_blocks.note_callout'))
            ->modalDescription(fn (): string => __('catalog.rich_blocks.note_callout_description'))
            ->modalWidth('md')
            ->schema([
                Select::make('note')
                    ->label(fn (): string => __('catalog.rich_blocks.note'))
                    ->options(fn (): array => collect(Catalog::NOTES)->flatten()->sort()->mapWithKeys(fn (string $note): array => [$note => ucfirst($note)])->all())
                    ->searchable()
                    ->required(),
                TextInput::make('origin')
                    ->label(fn (): string => __('catalog.rich_blocks.note_origin'))
                    ->maxLength(60),
                Textarea::make('description')
                    ->label(fn (): string => __('catalog.rich_blocks.note_description'))
                    ->rows(3)
                    ->maxLength(240)
                    ->required(),
            ]);
    }

    public static function toPreviewHtml(array $config): string
    {
        $note = e(ucfirst((string) ($config['note'] ?? '')));
        $origin = trim((string) ($config['origin'] ?? ''));
        $description = e((string) ($config['description'] ?? ''));
        $meta = $origin !== '' ? '<span class="text-muted-foreground"> · '.e($origin).'</span>' : '';

        return '<aside class="alfakit-custom-block-preview rounded-md border border-s-4 border-s-primary bg-muted/40 px-3 py-2 text-sm"><strong>'.$note.'</strong>'.$meta.'<p class="mt-1 text-muted-foreground">'.$description.'</p></aside>';
    }

    public static function toHtml(array $config, array $data): string
    {
        return static::toPreviewHtml($config);
    }
}
