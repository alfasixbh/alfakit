<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\ProductResource\Pages;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Actions\EditAction;
use AlfaSix\Alfakit\Resources\Pages\ViewRecord;
use App\Alfakit\Resources\ProductResource;
use App\Demo\CatalogText as Text;
use App\Demo\Renderer;
use App\Enums\ProductStatus;
use App\Models\Product;

class ViewProduct extends ViewRecord
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
            EditAction::make(),
        ];
    }
}
