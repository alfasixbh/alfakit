<?php

declare(strict_types=1);

namespace App\Alfakit\Resources;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Actions\DeleteAction;
use AlfaSix\Alfakit\Actions\DeleteBulkAction;
use AlfaSix\Alfakit\Actions\EditAction;
use AlfaSix\Alfakit\Forms\Components\ColorPicker;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Resources\Resource;
use AlfaSix\Alfakit\Schemas\Components\Component;
use AlfaSix\Alfakit\Schemas\Components\Utilities\Set;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Tables\Columns\ColorColumn;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Table;
use App\Alfakit\Resources\TagResource\Pages;
use App\Demo\CatalogText as Text;
use App\Demo\Nav;
use App\Models\Tag;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;

/**
 * Merchandising tags (Bestseller, Oud, Summer…). Shared reference data, managed entirely in
 * modals from the list page: the simplest resource shape AlfaKit offers.
 */
class TagResource extends Resource
{
    protected static ?string $model = Tag::class;

    protected static bool $isScopedToTenant = false;

    protected static ?string $navigationIcon = 'tags';

    protected static ?int $navigationSort = 40;

    protected static ?string $recordTitleAttribute = 'name';

    public static function getModelLabel(): string
    {
        return __('catalog.resources.tag');
    }

    public static function getPluralModelLabel(): string
    {
        return __('catalog.resources.tags');
    }

    public static function getNavigationLabel(): string
    {
        return __('catalog.navigation.tags');
    }

    public static function getNavigationGroup(): ?string
    {
        return Nav::group(Nav::CATALOG);
    }

    public static function form(Schema $schema): Schema
    {
        return $schema->components(static::fields())->columns(1);
    }

    /**
     * The same fields serve the create and edit modals on the list page.
     *
     * @return array<int, Component>
     */
    public static function fields(): array
    {
        return [
            TextInput::make('name')
                ->label(Text::field('name'))
                ->required()
                ->maxLength(40)
                ->live(onBlur: true)
                ->afterStateUpdated(fn (Set $set, ?string $state, string $operation) => $operation === 'create' ? $set('slug', Str::slug((string) $state)) : null),
            TextInput::make('slug')
                ->label(Text::field('slug'))
                ->required()
                ->maxLength(60)
                ->unique(ignoreRecord: true)
                ->rule('alpha_dash'),
            ColorPicker::make('color')
                ->label(Text::field('color'))
                ->hex()
                ->default('#073B78'),
        ];
    }

    public static function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (Builder $query) => $query->withCount([
                'products' => fn (Builder $q) => $q->where('products.store_id', alfakit()->getTenant()?->getKey()),
            ]))
            ->columns([
                ColorColumn::make('color')
                    ->label(Text::field('color')),
                TextColumn::make('name')
                    ->label(Text::field('name'))
                    ->searchable()
                    ->sortable()
                    ->weight('medium'),
                TextColumn::make('slug')
                    ->label(Text::field('slug'))
                    ->color('gray')
                    ->copyable()
                    ->toggleable(),
                TextColumn::make('products_count')
                    ->label(Text::field('products_count'))
                    ->numeric()
                    ->sortable()
                    ->alignEnd(),
                TextColumn::make('updated_at')
                    ->label(Text::field('updated_at'))
                    ->since()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->recordActions([
                Action::make('products')
                    ->label(Text::action('products'))
                    ->icon('spray-can')
                    ->color('gray')
                    ->url(fn (Tag $record): string => ProductResource::getUrl('index', ['filters' => ['tags' => ['values' => [$record->getKey()]]]])),
                EditAction::make()->schema(static::fields()),
                DeleteAction::make(),
            ])
            ->bulkActions([
                DeleteBulkAction::make(),
            ])
            ->defaultSort('name')
            ->paginationPageOptions([10, 25, 50]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListTags::route('/'),
        ];
    }

    public static function getGloballySearchableAttributes(): array
    {
        return ['name'];
    }
}
