<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\ProductResource\RelationManagers;

use AlfaSix\Alfakit\Actions\CreateAction;
use AlfaSix\Alfakit\Actions\DeleteAction;
use AlfaSix\Alfakit\Actions\DeleteBulkAction;
use AlfaSix\Alfakit\Actions\EditAction;
use AlfaSix\Alfakit\Forms\Components\MoneyInput;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Forms\Components\Toggle;
use AlfaSix\Alfakit\Resources\RelationManagers\RelationManager;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Columns\TextInputColumn;
use AlfaSix\Alfakit\Tables\Columns\ToggleColumn;
use AlfaSix\Alfakit\Tables\Table;
use App\Demo\CatalogText as Text;
use App\Models\ProductVariant;

/**
 * Sizes of a product: a table with inline stock editing and drag-to-reorder, plus modal forms.
 */
class VariantsRelationManager extends RelationManager
{
    protected static string $relationship = 'variants';

    protected static ?string $recordTitleAttribute = 'name';

    protected static ?string $icon = 'ruler';

    public static function getTitle(): string
    {
        return __('catalog.fields.variants');
    }

    public function getModelLabel(): string
    {
        return __('catalog.resources.variant');
    }

    public function getPluralModelLabel(): string
    {
        return __('catalog.resources.variants');
    }

    public function form(Schema $schema): Schema
    {
        return $schema->components([
            TextInput::make('sku')->label(Text::field('sku'))->required()->maxLength(48)->unique(ignoreRecord: true),
            TextInput::make('name')->label(Text::field('name'))->required()->maxLength(60)->placeholder('50 ml'),
            TextInput::make('size_ml')->label(Text::field('size_ml'))->integer()->minValue(1)->suffix('ml'),
            MoneyInput::make('price')->label(Text::field('price'))->currency('USD')->required()->minValue(0),
            TextInput::make('stock')->label(Text::field('stock'))->integer()->minValue(0)->default(0)->required(),
            Toggle::make('is_default')->label(Text::field('is_default')),
        ])->columns(2);
    }

    public function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('sku')->label(Text::field('sku'))->searchable()->weight('medium'),
                TextColumn::make('name')->label(Text::field('name'))->searchable(),
                TextColumn::make('size_ml')->label(Text::field('size_ml'))->suffix(' ml')->alignEnd()->placeholder('—'),
                TextColumn::make('price')->label(Text::field('price'))->money('USD')->sortable()->alignEnd(),
                TextInputColumn::make('stock')
                    ->label(Text::field('stock'))
                    ->type('number')
                    ->rules(['required', 'integer', 'min:0'])
                    ->alignEnd()
                    ->disabled(fn (): bool => $this->isReadOnly()),
                ToggleColumn::make('is_default')
                    ->label(Text::field('is_default'))
                    ->disabled(fn (): bool => $this->isReadOnly())
                    ->afterStateUpdated(function (ProductVariant $record, mixed $state): void {
                        // Only one default size per product.
                        if ($state) {
                            $record->product->variants()->whereKeyNot($record->getKey())->update(['is_default' => false]);
                        }
                    }),
            ])
            ->reorderable('sort_order')
            ->defaultSort('sort_order')
            ->headerActions([
                CreateAction::make()->label(Text::action('add_variant')),
            ])
            ->recordActions([
                EditAction::make(),
                DeleteAction::make(),
            ])
            ->bulkActions([
                DeleteBulkAction::make(),
            ])
            ->emptyStateHeading(Text::t('empty.variants_heading'))
            ->emptyStateDescription(Text::t('empty.variants_description'))
            ->emptyStateIcon('ruler')
            ->paginationPageOptions([10, 25]);
    }
}
