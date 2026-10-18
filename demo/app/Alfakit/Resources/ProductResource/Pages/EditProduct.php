<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\ProductResource\Pages;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Actions\DeleteAction;
use AlfaSix\Alfakit\Actions\RestoreAction;
use AlfaSix\Alfakit\Actions\ViewAction;
use AlfaSix\Alfakit\Resources\Pages\EditRecord;
use App\Alfakit\Resources\ProductResource;
use App\Demo\CatalogText as Text;
use App\Demo\Renderer;
use App\Enums\ProductStatus;
use App\Models\Product;

class EditProduct extends EditRecord
{
    protected static string $resource = ProductResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Action::make('storefront')
                ->label(Text::action('view_in_shop'))
                ->icon('external-link')
                ->color('gray')
                ->url(fn (Product $record): string => '/'.Renderer::current().'/products/'.$record->slug, shouldOpenInNewTab: true)
                ->visible(fn (Product $record): bool => $record->status === ProductStatus::Active),
            ViewAction::make(),
            DeleteAction::make(),
            RestoreAction::make(),
        ];
    }

    protected function mutateFormDataBeforeSave(array $data): array
    {
        if (($data['status'] ?? null) === ProductStatus::Active->value && empty($data['published_at'])) {
            $data['published_at'] = now();
        }

        return $data;
    }
}
