<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\CategoryResource\RelationManagers;

use AlfaSix\Alfakit\Actions\CreateAction;
use AlfaSix\Alfakit\Actions\EditAction;
use AlfaSix\Alfakit\Actions\ViewAction;
use AlfaSix\Alfakit\Resources\RelationManagers\RelationManager;
use AlfaSix\Alfakit\Tables\Table;
use App\Alfakit\Resources\CategoryProductResource;
use App\Demo\CatalogText as Text;

/**
 * Products filed under the category. Create / edit / view link to the nested
 * CategoryProductResource pages instead of opening modals.
 */
class ProductsRelationManager extends RelationManager
{
    protected static string $relationship = 'products';

    protected static ?string $relatedResource = CategoryProductResource::class;

    protected static ?string $recordTitleAttribute = 'name';

    protected static ?string $icon = 'spray-can';

    public static function getTitle(): string
    {
        return __('catalog.navigation.products');
    }

    public function table(Table $table): Table
    {
        return CategoryProductResource::table($table)
            ->headerActions([
                CreateAction::make(),
            ])
            ->recordActions([
                ViewAction::make()->label(Text::action('view')),
                EditAction::make()->label(Text::action('edit')),
            ])
            ->bulkActions([]);
    }
}
