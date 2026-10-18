<?php

declare(strict_types=1);

namespace App\Alfakit\Resources;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Actions\BulkAction;
use AlfaSix\Alfakit\Actions\DeleteAction;
use AlfaSix\Alfakit\Actions\DeleteBulkAction;
use AlfaSix\Alfakit\Actions\EditAction;
use AlfaSix\Alfakit\Forms\Components\FileUpload;
use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Forms\Components\Textarea;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Forms\Components\Toggle;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Resources\Resource;
use AlfaSix\Alfakit\Schemas\Components\Section;
use AlfaSix\Alfakit\Schemas\Components\Utilities\Get;
use AlfaSix\Alfakit\Schemas\Components\Utilities\Set;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Tables\Columns\IconColumn;
use AlfaSix\Alfakit\Tables\Columns\ImageColumn;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Filters\SelectFilter;
use AlfaSix\Alfakit\Tables\Filters\TernaryFilter;
use AlfaSix\Alfakit\Tables\Table;
use App\Alfakit\Resources\BrandResource\Pages;
use App\Demo\BrandArtwork;
use App\Demo\CatalogText as Text;
use App\Demo\Nav;
use App\Models\Brand;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Enumerable;
use Illuminate\Support\Str;

/**
 * Perfume houses. Brands are reference data shared by every store (`#[SharedAcrossTenants]`),
 * so the resource is not scoped to the tenant; the product count column still only counts
 * the current store's products.
 */
class BrandResource extends Resource
{
    protected static ?string $model = Brand::class;

    protected static bool $isScopedToTenant = false;

    protected static ?string $navigationIcon = 'gem';

    protected static ?int $navigationSort = 30;

    protected static ?string $recordTitleAttribute = 'name';

    /** ISO country codes the seeded houses come from, plus a few common origins. */
    private const COUNTRIES = ['AE', 'BH', 'DE', 'ES', 'FR', 'GB', 'IT', 'JP', 'MA', 'OM', 'SA', 'SE', 'US'];

    public static function getModelLabel(): string
    {
        return __('catalog.resources.brand');
    }

    public static function getPluralModelLabel(): string
    {
        return __('catalog.resources.brands');
    }

    public static function getNavigationLabel(): string
    {
        return __('catalog.navigation.brands');
    }

    public static function getNavigationGroup(): ?string
    {
        return Nav::group(Nav::CATALOG);
    }

    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            Section::make(Text::section('identity'))
                ->icon('gem')
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
                    Select::make('country')
                        ->label(Text::field('country'))
                        ->options(fn (): array => static::countryOptions())
                        ->searchable()
                        ->native(false),
                    TextInput::make('founded_year')
                        ->label(Text::field('founded_year'))
                        ->integer()
                        ->minValue(1700)
                        ->maxValue((int) now()->format('Y'))
                        ->prefixIcon('calendar'),
                    TextInput::make('website')
                        ->label(Text::field('website'))
                        ->url()
                        ->maxLength(200)
                        ->prefixIcon('globe')
                        ->placeholder('https://')
                        ->columnSpanFull(),
                    Textarea::make('description')
                        ->label(Text::field('description'))
                        ->rows(3)
                        ->maxLength(500)
                        ->columnSpanFull(),
                ])
                ->columns(2),
            Section::make(Text::section('media'))
                ->icon('image')
                ->schema([
                    FileUpload::make('logo_path')
                        ->label(Text::field('logo'))
                        ->disk(BrandArtwork::DISK)
                        ->directory(BrandArtwork::DIRECTORY)
                        ->image()
                        ->avatar()
                        ->maxSize(2048)
                        ->helperText(Text::hint('images')),
                    Toggle::make('is_featured')
                        ->label(Text::field('is_featured'))
                        ->inline(false),
                ])
                ->columns(2),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (Builder $query) => $query->withCount([
                'products' => fn (Builder $q) => $q->where('store_id', alfakit()->getTenant()?->getKey()),
            ]))
            ->columns([
                ImageColumn::make('logo_path')
                    ->label(Text::field('logo'))
                    ->disk(BrandArtwork::DISK)
                    ->circular()
                    ->size(36),
                TextColumn::make('name')
                    ->label(Text::field('name'))
                    ->searchable()
                    ->sortable()
                    ->weight('medium')
                    ->description(fn (Brand $record): ?string => $record->description ? str($record->description)->limit(60)->toString() : null),
                TextColumn::make('country')
                    ->label(Text::field('country'))
                    ->badge()
                    ->color('gray')
                    ->formatStateUsing(fn (?string $state): ?string => $state ? static::countryName($state) : null)
                    ->sortable()
                    ->toggleable(),
                TextColumn::make('founded_year')
                    ->label(Text::field('founded_year'))
                    ->sortable()
                    ->alignEnd()
                    ->toggleable(),
                TextColumn::make('products_count')
                    ->label(Text::field('products_count'))
                    ->numeric()
                    ->sortable()
                    ->alignEnd(),
                IconColumn::make('is_featured')
                    ->label(Text::field('is_featured'))
                    ->boolean()
                    ->trueIcon('star')
                    ->falseIcon('minus')
                    ->trueColor('warning')
                    ->falseColor('gray')
                    ->sortable(),
                TextColumn::make('website')
                    ->label(Text::field('website'))
                    ->formatStateUsing(fn (?string $state): ?string => $state ? Str::after($state, '://') : null)
                    ->url(fn (Brand $record): ?string => $record->website, true)
                    ->icon('external-link')
                    ->color('gray')
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('updated_at')
                    ->label(Text::field('updated_at'))
                    ->since()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                SelectFilter::make('country')
                    ->label(Text::field('country'))
                    ->options(fn (): array => static::countryOptions())
                    ->multiple(),
                TernaryFilter::make('is_featured')->label(Text::field('is_featured')),
            ])
            ->recordActions([
                Action::make('products')
                    ->label(Text::action('products'))
                    ->icon('spray-can')
                    ->color('gray')
                    ->url(fn (Brand $record): string => ProductResource::getUrl('index', ['filters' => ['brand_id' => ['values' => [$record->getKey()]]]])),
                EditAction::make(),
                DeleteAction::make(),
            ])
            ->bulkActions([
                BulkAction::make('feature')
                    ->label(Text::action('feature'))
                    ->icon('star')
                    ->color('warning')
                    ->authorizeIndividualRecords('update')
                    ->action(function (Enumerable $records): void {
                        $records->each(fn (Brand $brand) => $brand->update(['is_featured' => true]));

                        Notification::make()->title(trans_choice('catalog.notifications.brands_featured', $records->count(), ['count' => $records->count()]))->success()->send();
                    })
                    ->deselectRecordsAfterCompletion(),
                BulkAction::make('unfeature')
                    ->label(Text::action('unfeature'))
                    ->icon('star-off')
                    ->color('gray')
                    ->authorizeIndividualRecords('update')
                    ->action(function (Enumerable $records): void {
                        $records->each(fn (Brand $brand) => $brand->update(['is_featured' => false]));

                        Notification::make()->title(trans_choice('catalog.notifications.brands_unfeatured', $records->count(), ['count' => $records->count()]))->success()->send();
                    })
                    ->deselectRecordsAfterCompletion(),
                DeleteBulkAction::make(),
            ])
            ->defaultSort('name')
            ->paginationPageOptions([10, 25, 50]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListBrands::route('/'),
            'create' => Pages\CreateBrand::route('/create'),
            'edit' => Pages\EditBrand::route('/{record}/edit'),
        ];
    }

    public static function getGloballySearchableAttributes(): array
    {
        return ['name', 'country'];
    }

    public static function getGlobalSearchResultDetails(Model $record): array
    {
        /** @var Brand $record */
        return array_filter([
            __('catalog.fields.country') => $record->country ? static::countryName($record->country) : null,
            __('catalog.fields.founded_year') => $record->founded_year ? (string) $record->founded_year : null,
        ]);
    }

    public static function getGlobalSearchResultActions(Model $record): array
    {
        return [
            Action::make('products')->label(Text::action('products'))->icon('spray-can')->url(ProductResource::getUrl('index', ['filters' => ['brand_id' => ['values' => [$record->getKey()]]]])),
        ];
    }

    /** Country names in the user's language through the demo translations. */
    public static function countryName(string $code): string
    {
        $key = 'catalog.countries.'.strtoupper($code);
        $label = __($key);

        return $label === $key ? strtoupper($code) : $label;
    }

    /** @return array<string, string> */
    public static function countryOptions(): array
    {
        $codes = collect(self::COUNTRIES)
            ->merge(Brand::query()->whereNotNull('country')->distinct()->pluck('country'))
            ->unique()
            ->map(fn (string $code): string => strtoupper($code));

        return $codes->mapWithKeys(fn (string $code): array => [$code => static::countryName($code)])->sort()->all();
    }
}
