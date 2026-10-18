<?php

declare(strict_types=1);

namespace App\Alfakit\Resources;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Actions\DeleteAction;
use AlfaSix\Alfakit\Actions\DeleteBulkAction;
use AlfaSix\Alfakit\Actions\EditAction;
use AlfaSix\Alfakit\Forms\Components\IconPicker;
use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Forms\Components\Textarea;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Forms\Components\Toggle;
use AlfaSix\Alfakit\Resources\Resource;
use AlfaSix\Alfakit\Schemas\Components\Section;
use AlfaSix\Alfakit\Schemas\Components\Utilities\Get;
use AlfaSix\Alfakit\Schemas\Components\Utilities\Set;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Tables\Columns\IconColumn;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Columns\ToggleColumn;
use AlfaSix\Alfakit\Tables\Filters\SelectFilter;
use AlfaSix\Alfakit\Tables\Filters\TernaryFilter;
use AlfaSix\Alfakit\Tables\Grouping\Group as TableGroup;
use AlfaSix\Alfakit\Tables\Table;
use App\Alfakit\Resources\CategoryResource\Pages;
use App\Alfakit\Resources\CategoryResource\RelationManagers;
use App\Demo\CatalogText as Text;
use App\Demo\Nav;
use App\Models\Category;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Two-level category tree shared by every store: top-level groups (Fragrance, Home, Gifting)
 * and the leaves products are filed under. Products of a category are managed through the
 * nested CategoryProductResource (`/categories/{category}/products`).
 */
class CategoryResource extends Resource
{
    protected static ?string $model = Category::class;

    /** Categories are reference data shared by every store. */
    protected static bool $isScopedToTenant = false;

    protected static ?string $navigationIcon = 'folder-tree';

    protected static ?int $navigationSort = 20;

    protected static ?string $recordTitleAttribute = 'name';

    public static function getModelLabel(): string
    {
        return __('catalog.resources.category');
    }

    public static function getPluralModelLabel(): string
    {
        return __('catalog.resources.categories');
    }

    public static function getNavigationLabel(): string
    {
        return __('catalog.navigation.categories');
    }

    public static function getNavigationGroup(): ?string
    {
        return Nav::group(Nav::CATALOG);
    }

    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            Section::make(Text::section('identity'))
                ->description(Text::t('category.tree_hint'))
                ->icon('folder-tree')
                ->schema([
                    TextInput::make('name')
                        ->label(Text::field('name'))
                        ->required()
                        ->maxLength(80)
                        ->live(onBlur: true)
                        ->afterStateUpdated(fn (Set $set, ?string $state, string $operation) => $operation === 'create' ? $set('slug', Str::slug((string) $state)) : null),
                    TextInput::make('slug')
                        ->label(Text::field('slug'))
                        ->required()
                        ->maxLength(100)
                        ->unique(ignoreRecord: true)
                        ->rule('alpha_dash')
                        ->suffixAction(
                            Action::make('generateSlug')
                                ->label(Text::action('generate_slug'))
                                ->icon('sparkles')
                                ->iconButton()
                                ->action(fn (Get $get, Set $set) => $set('slug', Str::slug((string) $get('name')))),
                        ),
                    Select::make('parent_id')
                        ->label(Text::field('parent'))
                        ->relationship('parent', 'name', fn (Builder $query, ?Category $record) => $query->whereNull('parent_id')->when($record, fn (Builder $q) => $q->whereKeyNot($record->getKey())))
                        ->placeholder(Text::t('category.root'))
                        ->searchable()
                        ->preload(),
                    // Core IconPicker: Lucide icons searched on the server, shown in the tree too.
                    IconPicker::make('icon')
                        ->label(Text::field('icon'))
                        ->sets(['lucide'])
                        ->helperText(Text::t('category.icon_hint')),
                    TextInput::make('sort_order')
                        ->label(Text::field('sort_order'))
                        ->integer()
                        ->minValue(0)
                        ->default(0),
                    Toggle::make('is_visible')
                        ->label(Text::field('is_visible'))
                        ->default(true)
                        ->inline(false),
                    Textarea::make('description')
                        ->label(Text::field('description'))
                        ->rows(3)
                        ->maxLength(400)
                        ->columnSpanFull(),
                ])
                ->columns(2),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (Builder $query) => $query->with('parent')->withCount(['products', 'children']))
            ->columns([
                IconColumn::make('icon')
                    ->label(Text::field('icon'))
                    ->icon(fn (?string $state): string => $state ?: 'folder')
                    ->color('gray'),
                TextColumn::make('name')
                    ->label(Text::field('name'))
                    ->searchable()
                    ->sortable()
                    ->weight(fn (?Category $record): string => $record?->parent_id === null ? 'semibold' : 'normal')
                    ->description(fn (Category $record): ?string => $record->description ? str($record->description)->limit(70)->toString() : null),
                TextColumn::make('parent.name')
                    ->label(Text::field('parent'))
                    ->badge()
                    ->color('gray')
                    ->placeholder(fn (): string => __('catalog.category.root'))
                    ->sortable(),
                TextColumn::make('products_count')
                    ->label(Text::field('products_count'))
                    ->counts('products')
                    ->numeric()
                    ->sortable()
                    ->alignEnd()
                    ->url(fn (Category $record): string => CategoryProductResource::getUrl('index', ['category' => $record])),
                TextColumn::make('children_count')
                    ->label(Text::field('children_count'))
                    ->counts('children')
                    ->numeric()
                    ->alignEnd()
                    ->placeholder('—')
                    ->toggleable(),
                ToggleColumn::make('is_visible')
                    ->label(Text::field('is_visible')),
                TextColumn::make('sort_order')
                    ->label(Text::field('sort_order'))
                    ->numeric()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->groups([
                TableGroup::make('parent.name')
                    ->label(Text::field('parent'))
                    ->collapsible(),
            ])
            ->defaultGroup('parent.name')
            ->filters([
                SelectFilter::make('parent_id')
                    ->label(Text::field('parent'))
                    ->relationship('parent', 'name', fn (Builder $query) => $query->whereNull('parent_id'))
                    ->preload(),
                TernaryFilter::make('is_visible')->label(Text::field('is_visible')),
            ])
            ->recordActions([
                Action::make('products')
                    ->label(Text::action('products'))
                    ->icon('spray-can')
                    ->color('gray')
                    ->url(fn (Category $record): string => CategoryProductResource::getUrl('index', ['category' => $record])),
                EditAction::make(),
                DeleteAction::make(),
            ])
            ->bulkActions([
                DeleteBulkAction::make(),
            ])
            ->defaultSort('sort_order')
            ->reorderable('sort_order')
            ->paginationPageOptions([25, 50]);
    }

    public static function getRelations(): array
    {
        return [
            RelationManagers\ProductsRelationManager::class,
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListCategories::route('/'),
            'create' => Pages\CreateCategory::route('/create'),
            'edit' => Pages\EditCategory::route('/{record}/edit'),
            // alfasix/alfakit-tree: drag-and-drop nesting and order.
            'tree' => Pages\CategoryTree::route('/tree'),
        ];
    }

    public static function getGloballySearchableAttributes(): array
    {
        return ['name'];
    }

    public static function getGlobalSearchResultDetails(Model $record): array
    {
        /** @var Category $record */
        return [__('catalog.fields.parent') => $record->parent_id === null ? __('catalog.category.root') : $record->parent->name];
    }

    public static function getGlobalSearchResultActions(Model $record): array
    {
        return [
            Action::make('products')->label(Text::action('products'))->icon('spray-can')->url(CategoryProductResource::getUrl('index', ['category' => $record])),
        ];
    }
}
