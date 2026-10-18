<?php

declare(strict_types=1);

namespace App\Alfakit\Resources;

use AlfaSix\Alfakit\Actions\DeleteAction;
use AlfaSix\Alfakit\Actions\DeleteBulkAction;
use AlfaSix\Alfakit\Actions\EditAction;
use AlfaSix\Alfakit\Actions\ViewAction;
use AlfaSix\Alfakit\Resources\ParentResourceRegistration;
use AlfaSix\Alfakit\Resources\Resource;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Tables\Columns\ImageColumn;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Columns\ToggleColumn;
use AlfaSix\Alfakit\Tables\Filters\SelectFilter;
use AlfaSix\Alfakit\Tables\Table;
use App\Alfakit\Resources\CategoryProductResource\Pages;
use App\Demo\CatalogText as Text;
use App\Enums\ProductStatus;
use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;

/**
 * Products nested under a category: `/categories/{category}/products/...`. The query is
 * scoped to the parent, new products are created through the relationship and the
 * breadcrumbs start with the category. The form is the full product editor.
 */
class CategoryProductResource extends Resource
{
    protected static ?string $model = Product::class;

    protected static ?string $parentResource = CategoryResource::class;

    protected static ?string $recordTitleAttribute = 'name';

    // Products already appear in global search through ProductResource; a second "Products"
    // group pointing at the nested category URLs would only duplicate the results.
    protected static bool $isGloballySearchable = false;

    public static function getParentResourceRegistration(): ?ParentResourceRegistration
    {
        return CategoryResource::asParent()->relationship('products')->inverseRelationship('category');
    }

    public static function getModelLabel(): string
    {
        return __('catalog.resources.product');
    }

    public static function getPluralModelLabel(): string
    {
        return __('catalog.resources.products');
    }

    public static function form(Schema $schema): Schema
    {
        return ProductResource::form($schema);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (Builder $query) => $query->with('brand'))
            ->columns([
                ImageColumn::make('images')->label(Text::field('image'))->square()->size(40)->limit(1),
                TextColumn::make('name')
                    ->label(Text::field('name'))
                    ->searchable()
                    ->sortable()
                    ->weight('medium')
                    ->description(fn (Product $record): string => $record->sku),
                TextColumn::make('brand.name')->label(Text::field('brand'))->sortable(),
                TextColumn::make('price')->label(Text::field('price'))->money('USD')->sortable()->alignEnd(),
                TextColumn::make('stock')->label(Text::field('stock'))->numeric()->sortable()->alignEnd(),
                TextColumn::make('status')
                    ->label(Text::field('status'))
                    ->badge()
                    ->formatStateUsing(fn (mixed $state): ?string => $state instanceof ProductStatus ? $state->getLabel() : null)
                    ->color(fn (mixed $state): string => $state instanceof ProductStatus ? $state->getColor() : 'gray')
                    ->sortable(),
                ToggleColumn::make('featured')->label(Text::field('featured')),
            ])
            ->filters([
                SelectFilter::make('status')->label(Text::field('status'))->options(ProductStatus::options())->multiple(),
                SelectFilter::make('brand_id')->label(Text::field('brand'))->relationship('brand', 'name')->preload(),
            ])
            ->recordActions([
                ViewAction::make(),
                EditAction::make(),
                DeleteAction::make(),
            ])
            ->bulkActions([
                DeleteBulkAction::make(),
            ])
            ->defaultSort('name');
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListCategoryProducts::route('/'),
            'create' => Pages\CreateCategoryProduct::route('/create'),
            'view' => Pages\ViewCategoryProduct::route('/{record}'),
            'edit' => Pages\EditCategoryProduct::route('/{record}/edit'),
        ];
    }

    public static function infolist(Schema $schema): Schema
    {
        return ProductResource::infolist($schema);
    }
}
