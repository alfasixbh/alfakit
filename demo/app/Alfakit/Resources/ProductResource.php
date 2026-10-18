<?php

declare(strict_types=1);

namespace App\Alfakit\Resources;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Actions\ActionGroup;
use AlfaSix\Alfakit\Actions\BulkAction;
use AlfaSix\Alfakit\Actions\DeleteAction;
use AlfaSix\Alfakit\Actions\DeleteBulkAction;
use AlfaSix\Alfakit\Actions\EditAction;
use AlfaSix\Alfakit\Actions\ExportAction;
use AlfaSix\Alfakit\Actions\ExportBulkAction;
use AlfaSix\Alfakit\Actions\ForceDeleteBulkAction;
use AlfaSix\Alfakit\Actions\ImportAction;
use AlfaSix\Alfakit\Actions\ReplicateAction;
use AlfaSix\Alfakit\Actions\RestoreAction;
use AlfaSix\Alfakit\Actions\RestoreBulkAction;
use AlfaSix\Alfakit\Actions\ViewAction;
use AlfaSix\Alfakit\Forms\Components\Builder;
use AlfaSix\Alfakit\Forms\Components\Builder\Block;
use AlfaSix\Alfakit\Forms\Components\DateTimePicker;
use AlfaSix\Alfakit\Forms\Components\FileUpload;
use AlfaSix\Alfakit\Forms\Components\KeyValue;
use AlfaSix\Alfakit\Forms\Components\ModalTableSelect;
use AlfaSix\Alfakit\Forms\Components\MoneyInput;
use AlfaSix\Alfakit\Forms\Components\Repeater;
use AlfaSix\Alfakit\Forms\Components\Repeater\TableColumn;
use AlfaSix\Alfakit\Forms\Components\RichEditor;
use AlfaSix\Alfakit\Forms\Components\RichEditor\MentionProvider;
use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Forms\Components\Slider;
use AlfaSix\Alfakit\Forms\Components\TagsInput;
use AlfaSix\Alfakit\Forms\Components\Textarea;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Forms\Components\Toggle;
use AlfaSix\Alfakit\Forms\Components\ToggleButtons;
use AlfaSix\Alfakit\Infolists\Components\IconEntry;
use AlfaSix\Alfakit\Infolists\Components\ImageEntry;
use AlfaSix\Alfakit\Infolists\Components\KeyValueEntry;
use AlfaSix\Alfakit\Infolists\Components\RepeatableEntry;
use AlfaSix\Alfakit\Infolists\Components\TextEntry;
use AlfaSix\Alfakit\Infolists\Components\ViewEntry;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Resources\Pages\Page;
use AlfaSix\Alfakit\Resources\Resource;
use AlfaSix\Alfakit\Schemas\Components\Component;
use AlfaSix\Alfakit\Schemas\Components\Fieldset;
use AlfaSix\Alfakit\Schemas\Components\Grid;
use AlfaSix\Alfakit\Schemas\Components\Group;
use AlfaSix\Alfakit\Schemas\Components\Section;
use AlfaSix\Alfakit\Schemas\Components\Tabs;
use AlfaSix\Alfakit\Schemas\Components\Tabs\Tab;
use AlfaSix\Alfakit\Schemas\Components\Utilities\Get;
use AlfaSix\Alfakit\Schemas\Components\Utilities\Set;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Support\Currency;
use AlfaSix\Alfakit\Tables\Columns\Column;
use AlfaSix\Alfakit\Tables\Columns\ImageColumn;
use AlfaSix\Alfakit\Tables\Columns\Layout\Panel;
use AlfaSix\Alfakit\Tables\Columns\Layout\Split;
use AlfaSix\Alfakit\Tables\Columns\Layout\Stack;
use AlfaSix\Alfakit\Tables\Columns\Summarizers\Average;
use AlfaSix\Alfakit\Tables\Columns\Summarizers\Count;
use AlfaSix\Alfakit\Tables\Columns\Summarizers\Sum;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Columns\ToggleColumn;
use AlfaSix\Alfakit\Tables\Enums\FiltersLayout;
use AlfaSix\Alfakit\Tables\Filters\QueryBuilder;
use AlfaSix\Alfakit\Tables\Filters\QueryBuilder\Constraints\BooleanConstraint;
use AlfaSix\Alfakit\Tables\Filters\QueryBuilder\Constraints\DateConstraint;
use AlfaSix\Alfakit\Tables\Filters\QueryBuilder\Constraints\NumberConstraint;
use AlfaSix\Alfakit\Tables\Filters\QueryBuilder\Constraints\RelationshipConstraint;
use AlfaSix\Alfakit\Tables\Filters\QueryBuilder\Constraints\SelectConstraint;
use AlfaSix\Alfakit\Tables\Filters\QueryBuilder\Constraints\TextConstraint;
use AlfaSix\Alfakit\Tables\Filters\SelectFilter;
use AlfaSix\Alfakit\Tables\Filters\TernaryFilter;
use AlfaSix\Alfakit\Tables\Filters\TrashedFilter;
use AlfaSix\Alfakit\Tables\Grouping\Group as TableGroup;
use AlfaSix\Alfakit\Tables\Table;
use AlfaSix\Alfakit\Tables\Views\TableView;
use AlfaSix\AlfakitAi\Actions\AiAction;
use AlfaSix\AlfakitMediaLibrary\Forms\Components\SpatieMediaLibraryFileUpload;
use App\Alfakit\Exports\ProductExporter;
use App\Alfakit\Imports\ProductImporter;
use App\Alfakit\Resources\ProductResource\Pages;
use App\Alfakit\Resources\ProductResource\RelationManagers;
use App\Alfakit\RichContent\NoteCalloutBlock;
use App\Demo\Catalog;
use App\Demo\CatalogText as Text;
use App\Demo\Nav;
use App\Enums\Concentration;
use App\Enums\ProductStatus;
use App\Models\Brand;
use App\Models\Product;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Illuminate\Support\Enumerable;
use Illuminate\Support\Str;

/**
 * The catalog's centrepiece. The list switches between a classic table and a card grid
 * (Split / Stack / Panel layouts), the editor is organised in tabs, and the view page
 * draws the scent pyramid with a custom frontend component.
 */
class ProductResource extends Resource
{
    public const SESSION_LAYOUT = 'demo.catalog.layout';

    public const TRANSLATABLE_LOCALES = ['en', 'ar'];

    protected static ?string $model = Product::class;

    protected static ?string $navigationIcon = 'spray-can';

    protected static ?int $navigationSort = 10;

    protected static ?string $recordTitleAttribute = 'name';

    public static function getModelLabel(): string
    {
        return __('catalog.resources.product');
    }

    public static function getPluralModelLabel(): string
    {
        return __('catalog.resources.products');
    }

    public static function getNavigationLabel(): string
    {
        return __('catalog.navigation.products');
    }

    public static function getNavigationGroup(): ?string
    {
        return Nav::group(Nav::CATALOG);
    }

    // ---------------------------------------------------------------- Form

    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            Tabs::make()
                ->persistTabInQueryString()
                ->tabs([
                    Tab::make(Text::t('tabs.details'))->icon('info')->schema(static::detailsTab())->columns(1),
                    Tab::make(Text::t('tabs.pricing'))->icon('badge-dollar-sign')->schema(static::pricingTab())->columns(1),
                    Tab::make(Text::t('tabs.inventory'))->icon('boxes')->schema(static::inventoryTab())->columns(1),
                    Tab::make(Text::t('tabs.media'))->icon('images')->schema(static::mediaTab())->columns(1),
                    Tab::make(Text::t('tabs.page'))->icon('layout-template')->schema(static::pageTab())->columns(1),
                    Tab::make(Text::t('tabs.seo'))->icon('search')->schema(static::seoTab())->columns(1),
                ])
                ->columnSpanFull(),
        ]);
    }

    /** @return array<int, Component> */
    protected static function detailsTab(): array
    {
        return [
            Section::make(Text::section('identity'))
                ->description(Text::section('identity_description'))
                ->icon('tag')
                ->schema([
                    TextInput::make('name_translations')
                        ->label(Text::field('name'))
                        ->translatable(locales: self::TRANSLATABLE_LOCALES)
                        ->required()
                        ->maxLength(120)
                        ->live(onBlur: true)
                        ->afterStateUpdated(function (Set $set, Get $get, mixed $state, string $operation): void {
                            if ($operation !== 'create' || filled($get('slug'))) {
                                return;
                            }

                            $name = is_array($state) ? ($state[Product::DEFAULT_LOCALE] ?? '') : (string) $state;
                            $set('slug', Str::slug((string) $name));
                        })
                        ->columnSpanFull(),
                    TextInput::make('slug')
                        ->label(Text::field('slug'))
                        ->required()
                        ->maxLength(140)
                        ->rule('alpha_dash')
                        ->prefix('/products/')
                        ->helperText(Text::hint('slug'))
                        ->prefixAction(
                            Action::make('clearSlug')
                                ->label(Text::action('clear'))
                                ->icon('eraser')
                                ->iconButton()
                                ->action(fn (Set $set) => $set('slug', '')),
                        )
                        ->suffixAction(
                            Action::make('generateSlug')
                                ->label(Text::action('generate_slug'))
                                ->icon('sparkles')
                                ->iconButton()
                                ->action(function (Get $get, Set $set): void {
                                    $name = $get('name_translations');
                                    $name = is_array($name) ? ($name[Product::DEFAULT_LOCALE] ?? '') : (string) $name;
                                    $set('slug', Str::slug((string) $name));
                                }),
                        ),
                    TextInput::make('sku')
                        ->label(Text::field('sku'))
                        ->required()
                        ->maxLength(40)
                        ->unique(ignoreRecord: true)
                        ->prefixIcon('barcode')
                        ->helperText(Text::hint('sku'))
                        ->suffixAction(
                            Action::make('generateSku')
                                ->label(Text::action('generate_sku'))
                                ->icon('wand-sparkles')
                                ->iconButton()
                                ->action(function (Set $set): void {
                                    $set('sku', static::nextSku());

                                    Notification::make()->title(__('catalog.notifications.sku_generated'))->success()->send();
                                }),
                        ),
                ])
                ->columns(2),

            Section::make(Text::section('classification'))
                ->icon('layers')
                ->schema([
                    Select::make('brand_id')
                        ->label(Text::field('brand'))
                        ->relationship('brand', 'name')
                        ->searchable()
                        ->preload()
                        ->required()
                        ->createOptionModalHeading(Text::action('new_brand'))
                        ->createOptionForm([
                            TextInput::make('name')->label(Text::field('name'))->required()->maxLength(80),
                            TextInput::make('country')->label(Text::field('country'))->length(2)->placeholder('FR'),
                            TextInput::make('founded_year')->label(Text::field('founded_year'))->integer()->minValue(1700)->maxValue((int) date('Y')),
                        ])
                        ->createOptionUsing(fn (array $data): int => Brand::query()->create([
                            'name' => $data['name'],
                            'slug' => Str::slug($data['name']).'-'.Str::lower(Str::random(4)),
                            'country' => filled($data['country'] ?? null) ? Str::upper((string) $data['country']) : null,
                            'founded_year' => $data['founded_year'] ?? null,
                        ])->getKey()),
                    Select::make('category_id')
                        ->label(Text::field('category'))
                        ->relationship('category', 'name', fn (EloquentBuilder $query) => $query->whereNotNull('parent_id')->orderBy('sort_order'))
                        ->searchable()
                        ->preload(),
                    Select::make('concentration')
                        ->label(Text::field('concentration'))
                        ->options(Concentration::options())
                        ->required()
                        ->native(false),
                    ToggleButtons::make('audience')
                        ->label(Text::field('audience'))
                        ->options([
                            'unisex' => __('demo.audience.unisex'),
                            'women' => __('demo.audience.women'),
                            'men' => __('demo.audience.men'),
                        ])
                        ->icons(['unisex' => 'users', 'women' => 'flower', 'men' => 'mountain'])
                        ->default('unisex')
                        ->inline()
                        ->grouped(),
                    TextInput::make('size_ml')
                        ->label(Text::field('size_ml'))
                        ->integer()
                        ->minValue(1)
                        ->maxValue(5000)
                        ->suffix('ml'),
                    Select::make('tags')
                        ->label(Text::field('tags'))
                        ->relationship('tags', 'name')
                        ->multiple()
                        ->preload()
                        ->searchable(),
                ])
                ->columns(2),

            Section::make(Text::section('scent'))
                ->description(Text::section('scent_description'))
                ->icon('flower-2')
                ->schema([
                    Fieldset::make()
                        ->hiddenLabel()
                        ->statePath('scent_notes')
                        ->schema([
                            TagsInput::make('top')
                                ->label(Text::field('top_notes'))
                                ->suggestions(Catalog::NOTES['top'])
                                ->reorderable()
                                ->color('info'),
                            TagsInput::make('heart')
                                ->label(Text::field('heart_notes'))
                                ->suggestions(Catalog::NOTES['heart'])
                                ->reorderable()
                                ->color('primary'),
                            TagsInput::make('base')
                                ->label(Text::field('base_notes'))
                                ->suggestions(Catalog::NOTES['base'])
                                ->reorderable()
                                ->color('warning'),
                        ])
                        ->columns(3),
                ]),

            Section::make(Text::section('copy'))
                ->icon('text')
                ->schema([
                    RichEditor::make('description_translations')
                        ->label(Text::field('description'))
                        ->translatable(locales: self::TRANSLATABLE_LOCALES)
                        ->customBlocks([NoteCalloutBlock::class])
                        ->mentions([
                            MentionProvider::make('@')
                                ->getSearchResultsUsing(fn (string $search): array => Brand::query()->where('name', 'like', "%{$search}%")->orderBy('name')->limit(8)->pluck('name', 'id')->all())
                                ->getLabelsUsing(fn (array $ids): array => Brand::query()->whereKey($ids)->pluck('name', 'id')->all()),
                            MentionProvider::make('#')
                                ->getSearchResultsUsing(fn (string $search): array => Tag::query()->where('name', 'like', "%{$search}%")->orderBy('name')->limit(8)->pluck('name', 'id')->all())
                                ->getLabelsUsing(fn (array $ids): array => Tag::query()->whereKey($ids)->pluck('name', 'id')->all()),
                        ])
                        ->minHeight(220)
                        // alfasix/alfakit-ai: the writing assistant (sample answers in the demo).
                        ->aiAssist()
                        ->columnSpanFull(),
                ]),
        ];
    }

    /** @return array<int, Component> */
    protected static function pricingTab(): array
    {
        return [
            Section::make(Text::section('pricing'))
                ->description(Text::section('pricing_description'))
                ->icon('badge-dollar-sign')
                ->schema([
                    MoneyInput::make('price')
                        ->label(Text::field('price'))
                        ->currency('USD')
                        ->required()
                        ->minValue(0)
                        ->hintAction(
                            Action::make('suggestPrice')
                                ->label(Text::action('suggest_price'))
                                ->icon('calculator')
                                ->link()
                                ->tooltip(Text::hint('suggest_price'))
                                ->action(function (Get $get, Set $set): void {
                                    $cost = (float) ($get('cost') ?: 0);

                                    if ($cost <= 0) {
                                        return;
                                    }

                                    $set('price', number_format(round($cost * 2.4), 2, '.', ''));

                                    Notification::make()->title(__('catalog.notifications.price_suggested'))->success()->send();
                                }),
                        ),
                    MoneyInput::make('compare_at_price')
                        ->label(Text::field('compare_at_price'))
                        ->currency('USD')
                        ->minValue(0),
                    MoneyInput::make('cost')
                        ->label(Text::field('cost'))
                        ->currency('USD')
                        ->minValue(0)
                        ->helperText(Text::hint('cost'))
                        ->live(onBlur: true),
                ])
                ->columns(3),

            Section::make(Text::section('summary'))
                ->icon('chart-no-axes-combined')
                ->schema([
                    Toggle::make('featured')
                        ->label(Text::field('featured'))
                        ->onIcon('star')
                        ->offIcon('star-off')
                        ->inline(false),
                    ToggleButtons::make('status')
                        ->label(Text::field('status'))
                        ->options(ProductStatus::options())
                        ->colors(collect(ProductStatus::cases())->mapWithKeys(fn (ProductStatus $status): array => [$status->value => $status->getColor()])->all())
                        ->icons(collect(ProductStatus::cases())->mapWithKeys(fn (ProductStatus $status): array => [$status->value => $status->getIcon()])->all())
                        ->default(ProductStatus::Draft->value)
                        ->required()
                        ->inline()
                        ->live(),
                    DateTimePicker::make('published_at')
                        ->label(Text::field('published_at'))
                        ->seconds(false)
                        ->visible(fn (Get $get): bool => $get('status') === ProductStatus::Active->value),
                ])
                ->columns(3),
        ];
    }

    /** @return array<int, Component> */
    protected static function inventoryTab(): array
    {
        return [
            Section::make(Text::section('inventory'))
                ->icon('boxes')
                ->schema([
                    TextInput::make('stock')
                        ->label(Text::field('stock'))
                        ->integer()
                        ->minValue(0)
                        ->required()
                        ->default(0),
                    TextInput::make('sort_order')
                        ->label(Text::field('sort_order'))
                        ->integer()
                        ->minValue(0)
                        ->default(0),
                ])
                ->columns(2),

            Section::make(Text::section('variants'))
                ->description(Text::section('variants_description'))
                ->icon('ruler')
                ->schema([
                    Repeater::make('variants')
                        ->hiddenLabel()
                        ->relationship()
                        ->orderColumn('sort_order')
                        ->table([
                            TableColumn::make(Text::field('sku'))->width('22%'),
                            TableColumn::make(Text::field('name'))->markAsRequired(),
                            TableColumn::make(Text::field('size_ml'))->width('12%'),
                            TableColumn::make(Text::field('price'))->width('18%')->markAsRequired(),
                            TableColumn::make(Text::field('stock'))->width('12%'),
                            TableColumn::make(Text::field('is_default'))->width('10%'),
                        ])
                        ->schema([
                            TextInput::make('sku')->label(Text::field('sku'))->required()->maxLength(48)->unique(ignoreRecord: true),
                            TextInput::make('name')->label(Text::field('name'))->required()->maxLength(60),
                            TextInput::make('size_ml')->label(Text::field('size_ml'))->integer()->minValue(1),
                            MoneyInput::make('price')->label(Text::field('price'))->currency('USD')->required()->minValue(0),
                            TextInput::make('stock')->label(Text::field('stock'))->integer()->minValue(0)->default(0),
                            Toggle::make('is_default')->label(Text::field('is_default')),
                        ])
                        ->reorderable()
                        ->cloneable()
                        ->defaultItems(0)
                        ->addActionLabel(Text::action('add_variant'))
                        ->helperText(Text::hint('variants_default')),
                ]),

            Section::make(Text::section('specifications'))
                ->icon('list-checks')
                ->schema([
                    KeyValue::make('specifications')
                        ->hiddenLabel()
                        ->keyLabel(Text::field('specification'))
                        ->valueLabel(Text::field('value'))
                        ->addActionLabel(Text::action('add_specification'))
                        ->reorderable()
                        ->helperText(Text::hint('specifications')),
                ]),
        ];
    }

    /** @return array<int, Component> */
    protected static function mediaTab(): array
    {
        return [
            Section::make(Text::section('media'))
                ->description(Text::section('media_description'))
                ->icon('images')
                ->schema([
                    FileUpload::make('images')
                        ->hiddenLabel()
                        ->image()
                        ->multiple()
                        ->reorderable()
                        ->maxFiles(6)
                        ->maxSize(4096)
                        ->acceptedFileTypes(['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'])
                        ->imageCropAspectRatio('4:5')
                        ->imageResizeMode('cover')
                        ->imageResizeTargetWidth(800)
                        ->imageResizeTargetHeight(1000)
                        ->imagePreviewHeight(180)
                        ->panelLayout('grid')
                        ->directory('products/uploads')
                        ->downloadable()
                        ->openable()
                        ->helperText(Text::hint('images')),
                ]),
            // alfasix/alfakit-media-library: a lifestyle gallery stored as Spatie media.
            Section::make(fn (): string => __('plugins.media.gallery'))
                ->description(fn (): string => __('plugins.media.gallery_description'))
                ->icon('gallery-horizontal')
                ->schema([
                    SpatieMediaLibraryFileUpload::make('gallery')
                        ->hiddenLabel()
                        ->collection('gallery')
                        ->image()
                        ->multiple()
                        ->reorderable()
                        ->maxFiles(6)
                        ->maxSize(4096)
                        ->acceptedFileTypes(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
                        ->panelLayout('grid')
                        ->openable(),
                ]),
        ];
    }

    /** @return array<int, Component> */
    protected static function pageTab(): array
    {
        return [
            Section::make(Text::section('page'))
                ->description(Text::section('page_description'))
                ->icon('layout-template')
                ->schema([
                    Builder::make('sections')
                        ->hiddenLabel()
                        ->blocks([
                            Block::make('story')
                                ->label(Text::t('blocks.story'))
                                ->icon('book-open')
                                ->schema([
                                    TextInput::make('heading')->label(Text::t('blocks.story_heading'))->required()->maxLength(90),
                                    Textarea::make('body')->label(Text::t('blocks.story_body'))->rows(4)->required()->maxLength(1200)->columnSpanFull(),
                                ])
                                ->columns(1),
                            Block::make('quote')
                                ->label(Text::t('blocks.quote'))
                                ->icon('quote')
                                ->schema([
                                    Textarea::make('text')->label(Text::t('blocks.quote_text'))->rows(2)->required()->maxLength(280),
                                    TextInput::make('source')->label(Text::t('blocks.quote_source'))->maxLength(80),
                                ])
                                ->columns(1),
                            Block::make('tips')
                                ->label(Text::t('blocks.tips'))
                                ->icon('lightbulb')
                                ->schema([
                                    Repeater::make('items')
                                        ->label(Text::t('blocks.tips_items'))
                                        ->simple(TextInput::make('tip')->label(Text::t('blocks.tip'))->required()->maxLength(160))
                                        ->minItems(1)
                                        ->maxItems(5)
                                        ->reorderable(),
                                ]),
                            Block::make('callout')
                                ->label(Text::t('blocks.callout'))
                                ->icon('megaphone')
                                ->maxItems(2)
                                ->schema([
                                    TextInput::make('title')->label(Text::t('blocks.callout_title'))->required()->maxLength(80),
                                    ToggleButtons::make('tone')
                                        ->label(Text::t('blocks.callout_tone'))
                                        ->options([
                                            'info' => __('catalog.blocks.tone_info'),
                                            'success' => __('catalog.blocks.tone_success'),
                                            'warning' => __('catalog.blocks.tone_warning'),
                                        ])
                                        ->colors(['info' => 'info', 'success' => 'success', 'warning' => 'warning'])
                                        ->default('info')
                                        ->inline(),
                                    Textarea::make('body')->label(Text::t('blocks.callout_body'))->rows(3)->required()->maxLength(400)->columnSpanFull(),
                                ])
                                ->columns(2),
                        ])
                        ->blockPickerColumns(2)
                        ->collapsible()
                        ->cloneable()
                        ->addActionLabel(Text::action('add_section')),
                ]),

            Section::make(Text::section('related'))
                ->description(Text::section('related_description'))
                ->icon('sparkles')
                ->schema([
                    ModalTableSelect::make('relatedProducts')
                        ->hiddenLabel()
                        ->relationship('relatedProducts', 'name')
                        ->multiple()
                        ->maxItems(4)
                        ->tableConfiguration(fn (Table $table): Table => static::pickerTable($table)),
                ]),
        ];
    }

    /** @return array<int, Component> */
    protected static function seoTab(): array
    {
        return [
            Section::make(Text::section('seo'))
                ->description(Text::section('seo_description'))
                ->icon('search')
                ->schema([
                    TextInput::make('meta_title')
                        ->label(Text::field('meta_title'))
                        ->maxLength(70),
                    Textarea::make('meta_description')
                        ->label(Text::field('meta_description'))
                        ->rows(3)
                        ->maxLength(160)
                        ->live(onBlur: true)
                        ->helperText(fn (Get $get): string => trans_choice('catalog.hints.meta_description', $left = max(0, 160 - Str::length((string) $get('meta_description'))), ['count' => $left])),
                    Slider::make('min_review_rating')
                        ->label(Text::field('min_review_rating'))
                        ->range(minValue: 1, maxValue: 5)
                        ->step(1)
                        ->default(1)
                        ->pips()
                        ->tooltips()
                        ->fillTrack()
                        ->helperText(Text::hint('min_review_rating')),
                ])
                ->columns(1),
        ];
    }

    /** The compact table shown inside the "related products" picker modal. */
    public static function pickerTable(Table $table): Table
    {
        return $table
            ->columns([
                ImageColumn::make('images')->label(Text::field('image'))->square()->size(40)->limit(1),
                TextColumn::make('name')->label(Text::field('name'))->searchable()->sortable()->weight('medium'),
                TextColumn::make('brand.name')->label(Text::field('brand'))->sortable(),
                TextColumn::make('price')->label(Text::field('price'))->money('USD')->sortable()->alignEnd(),
            ])
            ->filters([
                SelectFilter::make('brand_id')->label(Text::field('brand'))->relationship('brand', 'name')->preload(),
            ])
            ->defaultSort('name')
            ->paginationPageOptions([10, 25])
            ->defaultPaginationPageOption(10);
    }

    // ---------------------------------------------------------------- Infolist

    public static function infolist(Schema $schema): Schema
    {
        return $schema->components([
            Grid::make(['default' => 1, 'lg' => 3])->schema([
                Group::make([
                    Section::make(Text::section('summary'))
                        ->icon('spray-can')
                        ->schema([
                            TextEntry::make('brand.name')->label(Text::field('brand'))->icon('building-2'),
                            TextEntry::make('category.name')->label(Text::field('category'))->badge()->color('gray'),
                            TextEntry::make('concentration')
                                ->label(Text::field('concentration'))
                                ->badge()
                                ->formatStateUsing(fn (mixed $state): ?string => $state instanceof Concentration ? $state->getLabel() : (is_string($state) ? Concentration::tryFrom($state)?->getLabel() : null))
                                ->color(fn (mixed $state): string => $state instanceof Concentration ? $state->getColor() : 'gray'),
                            TextEntry::make('status')
                                ->label(Text::field('status'))
                                ->badge()
                                ->formatStateUsing(fn (mixed $state): ?string => $state instanceof ProductStatus ? $state->getLabel() : (is_string($state) ? ProductStatus::tryFrom($state)?->getLabel() : null))
                                ->color(fn (mixed $state): string => $state instanceof ProductStatus ? $state->getColor() : 'gray'),
                            TextEntry::make('size_ml')->label(Text::field('size_ml'))->suffix(' ml')->placeholder('—'),
                            TextEntry::make('audience')->label(Text::field('audience'))->formatStateUsing(fn (?string $state): ?string => $state ? __('demo.audience.'.$state) : null),
                            TextEntry::make('tags.name')->label(Text::field('tags'))->badge()->color('info')->placeholder('—')->columnSpanFull(),
                            TextEntry::make('description')->label(Text::field('description'))->html()->prose()->columnSpanFull(),
                            ViewEntry::make('scent_notes')
                                ->label(Text::field('scent_notes'))
                                ->view('ScentPyramid')
                                ->viewData(fn (): array => [
                                    'labels' => [
                                        'top' => __('catalog.pyramid.top'),
                                        'heart' => __('catalog.pyramid.heart'),
                                        'base' => __('catalog.pyramid.base'),
                                        'empty' => __('catalog.pyramid.empty'),
                                    ],
                                ])
                                ->columnSpanFull(),
                        ])
                        ->columns(['default' => 1, 'md' => 3]),

                    Section::make(Text::section('specifications'))
                        ->icon('list-checks')
                        ->collapsible()
                        ->schema([
                            KeyValueEntry::make('specifications')
                                ->hiddenLabel()
                                ->keyLabel(Text::field('specification'))
                                ->valueLabel(Text::field('value')),
                        ])
                        ->visible(fn (?Product $record): bool => filled($record?->specifications)),

                    Section::make(Text::section('variants'))
                        ->icon('ruler')
                        ->collapsible()
                        ->schema([
                            RepeatableEntry::make('variants')
                                ->hiddenLabel()
                                ->table([
                                    RepeatableEntry\TableColumn::make(Text::field('sku')),
                                    RepeatableEntry\TableColumn::make(Text::field('name')),
                                    RepeatableEntry\TableColumn::make(Text::field('price')),
                                    RepeatableEntry\TableColumn::make(Text::field('stock')),
                                    RepeatableEntry\TableColumn::make(Text::field('is_default')),
                                ])
                                ->schema([
                                    TextEntry::make('sku'),
                                    TextEntry::make('name'),
                                    TextEntry::make('price')->money('USD'),
                                    TextEntry::make('stock')->numeric(),
                                    IconEntry::make('is_default')->boolean(),
                                ]),
                        ])
                        ->visible(fn (?Product $record): bool => $record !== null && $record->variants()->exists()),
                ])->columnSpan(['default' => 1, 'lg' => 2]),

                Group::make([
                    Section::make(Text::section('media'))
                        ->icon('images')
                        ->schema([
                            ImageEntry::make('images')->hiddenLabel()->height(260)->stacked()->limit(3),
                        ]),
                    Section::make(Text::section('pricing'))
                        ->icon('badge-dollar-sign')
                        ->schema([
                            TextEntry::make('price')->label(Text::field('price'))->money('USD')->size('lg')->weight('semibold'),
                            TextEntry::make('compare_at_price')->label(Text::field('compare_at_price'))->money('USD')->placeholder('—'),
                            TextEntry::make('cost')->label(Text::field('cost'))->money('USD')->placeholder('—')->visible(fn (): bool => static::viewerIsManager()),
                            TextEntry::make('margin')
                                ->label(Text::field('margin'))
                                ->state(fn (Product $record): ?string => $record->marginPercent() === null ? null : number_format($record->marginPercent(), 1).' %')
                                ->placeholder('—')
                                ->color(fn (Product $record): string => ($record->marginPercent() ?? 0) >= 50 ? 'success' : 'warning')
                                ->visible(fn (): bool => static::viewerIsManager()),
                            TextEntry::make('stock')
                                ->label(Text::field('stock'))
                                ->badge()
                                ->formatStateUsing(fn (mixed $state): string => match (true) {
                                    (int) $state <= 0 => __('catalog.stock.out'),
                                    (int) $state <= 5 => __('catalog.stock.low').' · '.$state,
                                    default => (string) $state,
                                })
                                ->color(fn (mixed $state): string => match (true) {
                                    (int) $state <= 0 => 'danger',
                                    (int) $state <= 5 => 'warning',
                                    default => 'success',
                                }),
                            IconEntry::make('featured')->label(Text::field('featured'))->boolean()->trueIcon('star')->trueColor('warning'),
                            TextEntry::make('reviews_avg_rating')
                                ->label(Text::field('average_rating'))
                                ->state(fn (Product $record): ?string => ($avg = $record->approvedReviews()->avg('rating')) === null ? null : number_format((float) $avg, 1).' / 5')
                                ->icon('star')
                                ->iconColor('warning')
                                ->placeholder('—'),
                            TextEntry::make('published_at')->label(Text::field('published_at'))->dateTime()->placeholder('—'),
                            TextEntry::make('updated_at')->label(Text::field('updated_at'))->since(),
                        ])
                        ->columns(2),
                    Section::make(Text::section('seo'))
                        ->icon('search')
                        ->collapsible()
                        ->collapsed()
                        ->schema([
                            TextEntry::make('meta_title')->label(Text::field('meta_title'))->placeholder('—'),
                            TextEntry::make('meta_description')->label(Text::field('meta_description'))->placeholder('—'),
                            TextEntry::make('min_review_rating')->label(Text::field('min_review_rating'))->suffix(' ★'),
                        ]),
                ])->columnSpan(1),
            ])->columnSpanFull(),
        ]);
    }

    // ---------------------------------------------------------------- Table

    public static function usesCardLayout(): bool
    {
        return session(self::SESSION_LAYOUT, 'table') === 'cards';
    }

    public static function table(Table $table): Table
    {
        $cards = static::usesCardLayout();

        return $table
            ->modifyQueryUsing(fn (EloquentBuilder $query) => $query->with(['brand', 'category', 'tags']))
            ->columns($cards ? static::cardColumns() : static::tableColumns())
            ->contentGrid($cards ? ['md' => 2, 'xl' => 3] : null)
            ->groups([
                TableGroup::make('brand.name')->label(Text::t('groups.brand'))->collapsible(),
                TableGroup::make('category.name')->label(Text::t('groups.category'))->collapsible(),
                TableGroup::make('status')
                    ->label(Text::t('groups.status'))
                    ->getTitleFromRecordUsing(fn (Product $record): string => $record->status->getLabel())
                    ->collapsible(),
                TableGroup::make('concentration')
                    ->label(Text::t('groups.concentration'))
                    ->getTitleFromRecordUsing(fn (Product $record): string => $record->concentration->getLabel()),
            ])
            ->filters([
                SelectFilter::make('status')
                    ->label(Text::t('filters.status'))
                    ->options(ProductStatus::options())
                    ->multiple(),
                SelectFilter::make('brand_id')
                    ->label(Text::t('filters.brand'))
                    ->relationship('brand', 'name')
                    ->multiple()
                    ->preload(),
                SelectFilter::make('category_id')
                    ->label(Text::t('filters.category'))
                    ->relationship('category', 'name', fn (EloquentBuilder $query) => $query->whereNotNull('parent_id'))
                    ->preload(),
                SelectFilter::make('tags')
                    ->label(Text::field('tags'))
                    ->relationship('tags', 'name')
                    ->multiple()
                    ->preload(),
                SelectFilter::make('concentration')
                    ->label(Text::t('filters.concentration'))
                    ->options(Concentration::options())
                    ->multiple(),
                TernaryFilter::make('featured')
                    ->label(Text::t('filters.featured')),
                TernaryFilter::make('low_stock')
                    ->label(Text::t('filters.low_stock'))
                    ->trueLabel(Text::t('filters.low_stock_true'))
                    ->falseLabel(Text::t('filters.low_stock_false'))
                    ->queries(
                        true: fn (EloquentBuilder $query) => $query->where('stock', '<=', 5),
                        false: fn (EloquentBuilder $query) => $query->where('stock', '>', 5),
                    ),
                TrashedFilter::make(),
                QueryBuilder::make()
                    ->label(Text::t('filters.query_builder'))
                    ->constraints([
                        TextConstraint::make('name')->label(Text::field('name')),
                        TextConstraint::make('sku')->label(Text::field('sku')),
                        TextConstraint::make('brand.name')->label(Text::field('brand')),
                        NumberConstraint::make('price')->label(Text::field('price')),
                        NumberConstraint::make('stock')->label(Text::field('stock'))->integer(),
                        NumberConstraint::make('size_ml')->label(Text::field('size_ml'))->integer(),
                        DateConstraint::make('published_at')->label(Text::field('published_at')),
                        BooleanConstraint::make('featured')->label(Text::field('featured')),
                        SelectConstraint::make('status')->label(Text::field('status'))->options(ProductStatus::options())->multiple(),
                        SelectConstraint::make('concentration')->label(Text::field('concentration'))->options(Concentration::options())->multiple(),
                        RelationshipConstraint::make('tags')->label(Text::field('tags'))->titleAttribute('name')->multiple(),
                        RelationshipConstraint::make('category')->label(Text::field('category'))->titleAttribute('name'),
                    ])
                    ->maxDepth(2),
            ], layout: FiltersLayout::Modal)
            ->deferFilters()
            ->persistFiltersInSession()
            ->persistSortInSession()
            ->reorderableColumns()
            // Saved views (code-defined tabs plus the users' own) and spreadsheet editing of
            // price and stock in the table layout.
            ->savedViews()
            ->views([
                TableView::make('low_stock')->label(fn (): string => __('plugins.views.low_stock'))->icon('triangle-alert')
                    ->filters(['low_stock' => ['value' => '1']])->sort('stock', 'asc'),
                TableView::make('featured')->label(fn (): string => __('plugins.views.featured'))->icon('star')
                    ->filters(['featured' => ['value' => '1']]),
                TableView::make('drafts')->label(fn (): string => __('plugins.views.drafts'))->icon('file-pen')
                    ->filters(['status' => ['values' => [ProductStatus::Draft->value]]]),
            ])
            ->spreadsheet(atomic: true)
            ->headerActions([
                Action::make('layout')
                    ->label($cards ? Text::action('table') : Text::action('cards'))
                    ->icon($cards ? 'table' : 'layout-grid')
                    ->color('gray')
                    ->outlined()
                    ->action(fn () => session()->put(self::SESSION_LAYOUT, static::usesCardLayout() ? 'table' : 'cards')),
                ImportAction::make()
                    ->label(Text::action('import'))
                    ->importer(ProductImporter::class)
                    ->maxRows(2000)
                    ->rateLimit(5, decaySeconds: 3600)
                    ->color('gray')
                    ->outlined(),
                ExportAction::make()
                    ->label(Text::action('export'))
                    ->exporter(ProductExporter::class)
                    ->color('gray')
                    ->outlined(),
            ])
            ->recordActions([
                ActionGroup::make([
                    ViewAction::make(),
                    EditAction::make(),
                    Action::make('restock')
                        ->label(Text::action('restock'))
                        ->icon('package-plus')
                        ->color('success')
                        ->modalHeading(Text::t('modals.restock_heading'))
                        ->modalWidth('sm')
                        ->schema([
                            TextInput::make('quantity')->label(Text::t('modals.restock_quantity'))->integer()->minValue(1)->maxValue(10000)->required()->default(10)->autofocus(),
                        ])
                        ->action(function (Product $record, array $data): void {
                            $record->increment('stock', (int) $data['quantity']);

                            Notification::make()->title(__('catalog.notifications.restocked'))->success()->send();
                        })
                        ->authorize('update'),
                    ReplicateAction::make()
                        ->excludeAttributes(['sku', 'slug', 'images', 'published_at'])
                        ->beforeReplicaSaved(function (Product $replica): void {
                            $replica->sku = static::nextSku();
                            $replica->slug = Str::slug($replica->name.'-'.Str::lower(Str::afterLast($replica->sku, '-')));
                            $replica->status = ProductStatus::Draft;
                            $replica->featured = false;
                            $replica->images = [];
                        }),
                    AiAction::make('summariseReviews')
                        ->label(fn (): string => __('plugins.ai.summarise_reviews'))
                        ->icon('sparkles')
                        ->modalHeading(fn (Product $record): string => __('plugins.ai.summarise_heading', ['name' => $record->name]))
                        ->prompt(fn (Product $record): string => __('plugins.ai.summarise_prompt', ['name' => $record->name])."\n\n".$record->approvedReviews()->latest('approved_at')->limit(25)->get(['rating', 'title', 'body'])
                            ->map(fn ($review): string => "- {$review->rating}/5 {$review->title}: {$review->body}")->implode("\n")),
                    DeleteAction::make()->undoable(),
                    RestoreAction::make(),
                ]),
            ])
            ->bulkActions([
                BulkAction::make('publish')
                    ->label(Text::action('publish'))
                    ->icon('circle-check')
                    ->color('success')
                    ->requiresConfirmation()
                    ->modalHeading(Text::action('publish'))
                    ->modalDescription(Text::t('modals.publish_description'))
                    ->authorizeIndividualRecords('update')
                    ->chunkSelectedRecords(200)
                    ->action(function (Enumerable $records): void {
                        $count = 0;

                        foreach ($records as $product) {
                            /** @var Product $product */
                            $product->forceFill(['status' => ProductStatus::Active, 'published_at' => $product->published_at ?? now()])->save();
                            $count++;
                        }

                        Notification::make()->title(trans_choice('catalog.notifications.published', $count, ['count' => $count]))->success()->send();
                    }),
                BulkAction::make('archive')
                    ->label(Text::action('archive'))
                    ->icon('archive')
                    ->color('warning')
                    ->requiresConfirmation()
                    ->modalHeading(Text::action('archive'))
                    ->modalDescription(Text::t('modals.archive_description'))
                    ->authorizeIndividualRecords('update')
                    ->chunkSelectedRecords(200)
                    ->action(function (Enumerable $records): void {
                        $count = 0;

                        foreach ($records as $product) {
                            /** @var Product $product */
                            $product->forceFill(['status' => ProductStatus::Archived, 'featured' => false])->save();
                            $count++;
                        }

                        Notification::make()->title(trans_choice('catalog.notifications.archived', $count, ['count' => $count]))->warning()->send();
                    }),
                BulkAction::make('feature')
                    ->label(Text::action('feature'))
                    ->icon('star')
                    ->authorizeIndividualRecords('update')
                    ->action(function (Enumerable $records): void {
                        $count = 0;

                        foreach ($records as $product) {
                            /** @var Product $product */
                            $product->forceFill(['featured' => true])->save();
                            $count++;
                        }

                        Notification::make()->title(trans_choice('catalog.notifications.featured', $count, ['count' => $count]))->success()->send();
                    }),
                ExportBulkAction::make()->exporter(ProductExporter::class),
                DeleteBulkAction::make()->undoable(),
                RestoreBulkAction::make(),
                ForceDeleteBulkAction::make(),
            ])
            ->defaultSort('created_at', 'desc')
            // Rows first; the count (and page numbers) load right after.
            ->deferTotals()
            ->striped(! $cards)
            ->emptyStateHeading(Text::t('empty.products_heading'))
            ->emptyStateDescription(Text::t('empty.products_description'))
            ->emptyStateIcon('spray-can')
            ->paginationPageOptions([12, 24, 48])
            ->defaultPaginationPageOption(12);
    }

    /** Classic columns, with inline toggles, aggregates and summaries. */
    /** @return array<int, Column> */
    protected static function tableColumns(): array
    {
        return [
            ImageColumn::make('images')
                ->label(Text::field('image'))
                ->square()
                ->size(44)
                ->stacked()
                ->limit(2)
                ->limitedRemainingText(),
            TextColumn::make('name')
                ->label(Text::field('name'))
                ->searchable()
                ->sortable()
                ->weight('medium')
                ->description(fn (Product $record): string => $record->sku)
                ->summarize(Count::make()->label(Text::t('summaries.products'))),
            TextColumn::make('brand.name')
                ->label(Text::field('brand'))
                ->sortable()
                ->toggleable(),
            TextColumn::make('category.name')
                ->label(Text::field('category'))
                ->badge()
                ->color('gray')
                ->sortable()
                ->toggleable(),
            TextColumn::make('concentration')
                ->label(Text::field('concentration'))
                ->badge()
                ->formatStateUsing(fn (mixed $state): ?string => $state instanceof Concentration ? $state->getLabel() : (is_string($state) ? Concentration::tryFrom($state)?->getLabel() : null))
                ->color(fn (mixed $state): string => $state instanceof Concentration ? $state->getColor() : 'gray')
                ->icon(fn (mixed $state): ?string => $state instanceof Concentration ? $state->getIcon() : null)
                ->sortable()
                ->toggleable(isToggledHiddenByDefault: true),
            TextColumn::make('price')
                ->label(Text::field('price'))
                ->money('USD')
                ->sortable()
                ->alignEnd()
                ->editable()
                ->rules(['required', 'numeric', 'min:0', 'max:100000'])
                ->summarize(Average::make()->money('USD')->label(Text::t('summaries.average_price'))),
            TextColumn::make('stock')
                ->label(Text::field('stock'))
                ->numeric()
                ->sortable()
                ->alignEnd()
                ->editable()
                ->rules(['required', 'integer', 'min:0', 'max:100000'])
                ->color(fn (mixed $state): string => match (true) {
                    (int) $state <= 0 => 'danger',
                    (int) $state <= 5 => 'warning',
                    default => 'gray',
                })
                ->icon(fn (mixed $state): ?string => (int) $state <= 5 ? 'triangle-alert' : null)
                ->summarize(Sum::make()->label(Text::t('summaries.total_stock'))),
            TextColumn::make('status')
                ->label(Text::field('status'))
                ->badge()
                ->formatStateUsing(fn (mixed $state): ?string => $state instanceof ProductStatus ? $state->getLabel() : (is_string($state) ? ProductStatus::tryFrom($state)?->getLabel() : null))
                ->color(fn (mixed $state): string => $state instanceof ProductStatus ? $state->getColor() : 'gray')
                ->sortable(),
            ToggleColumn::make('featured')
                ->label(Text::field('featured'))
                ->onIcon('star')
                ->offIcon('star-off')
                ->disabled(fn (): bool => ! static::viewerIsManager()),
            TextColumn::make('reviews_avg_rating')
                ->label(Text::field('average_rating'))
                ->avg('reviews', 'rating')
                ->numeric(decimalPlaces: 1)
                ->icon('star')
                ->iconColor('warning')
                ->sortable()
                ->alignEnd()
                ->placeholder('—')
                ->toggleable(),
            TextColumn::make('published_at')
                ->label(Text::field('published_at'))
                ->since()
                ->sortable()
                ->placeholder('—')
                ->toggleable(),
            TextColumn::make('created_at')
                ->label(Text::field('created_at'))
                ->dateTime()
                ->sortable()
                ->toggleable(isToggledHiddenByDefault: true),
            TextColumn::make('deleted_at')
                ->label(Text::field('deleted_at'))
                ->dateTime()
                ->toggleable(isToggledHiddenByDefault: true),
        ];
    }

    /** Card layout: artwork beside a stack of name, brand and price, with a collapsible panel. */
    /** @return array<int, Column|\AlfaSix\Alfakit\Tables\Columns\Layout\Component> */
    protected static function cardColumns(): array
    {
        return [
            Split::make([
                ImageColumn::make('images')
                    ->label(Text::field('image'))
                    ->square()
                    ->size(88)
                    ->limit(1)
                    ->grow(false),
                Stack::make([
                    TextColumn::make('name')
                        ->label(Text::field('name'))
                        ->weight('semibold')
                        ->size('lg')
                        ->searchable()
                        ->sortable(),
                    TextColumn::make('brand.name')
                        ->label(Text::field('brand'))
                        ->icon('building-2')
                        ->color('gray')
                        ->sortable(),
                    Split::make([
                        TextColumn::make('price')
                            ->label(Text::field('price'))
                            ->money('USD')
                            ->weight('medium')
                            ->sortable()
                            ->summarize(Average::make()->money('USD')->label(Text::t('summaries.average_price'))),
                        TextColumn::make('status')
                            ->label(Text::field('status'))
                            ->badge()
                            ->formatStateUsing(fn (mixed $state): ?string => $state instanceof ProductStatus ? $state->getLabel() : (is_string($state) ? ProductStatus::tryFrom($state)?->getLabel() : null))
                            ->color(fn (mixed $state): string => $state instanceof ProductStatus ? $state->getColor() : 'gray')
                            ->grow(false),
                    ]),
                ])->space(1),
            ])->from('sm'),
            Panel::make([
                Stack::make([
                    TextColumn::make('tags.name')
                        ->label(Text::field('tags'))
                        ->badge()
                        ->color('info')
                        ->limitList(3),
                    TextColumn::make('scent_notes.heart')
                        ->label(Text::field('heart_notes'))
                        ->listWithLineBreaks(false)
                        ->limitList(3)
                        ->icon('flower-2')
                        ->color('gray'),
                    TextColumn::make('stock')
                        ->label(Text::field('stock'))
                        ->numeric()
                        ->prefix(fn (): string => __('catalog.fields.stock').': ')
                        ->color(fn (mixed $state): string => (int) $state <= 5 ? 'danger' : 'gray')
                        ->summarize(Sum::make()->label(Text::t('summaries.total_stock'))),
                ])->space(1),
            ])->collapsible(),
        ];
    }

    // ---------------------------------------------------------------- Pages & relations

    public static function getRelations(): array
    {
        return [
            RelationManagers\VariantsRelationManager::class,
            RelationManagers\ReviewsRelationManager::class,
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListProducts::route('/'),
            'create' => Pages\CreateProduct::route('/create'),
            'view' => Pages\ViewProduct::route('/{record}'),
            'edit' => Pages\EditProduct::route('/{record}/edit'),
        ];
    }

    public static function getRecordSubNavigation(Page $page): array
    {
        return $page->generateNavigationItems([
            Pages\ViewProduct::class,
            Pages\EditProduct::class,
        ]);
    }

    public static function getEloquentQuery(): EloquentBuilder
    {
        return parent::getEloquentQuery()->withoutGlobalScopes([SoftDeletingScope::class]);
    }

    // ---------------------------------------------------------------- Global search

    public static function getGloballySearchableAttributes(): array
    {
        return ['name', 'sku', 'brand.name'];
    }

    public static function getGlobalSearchResultDetails(Model $record): array
    {
        /** @var Product $record */
        return [
            __('catalog.global_search.brand') => $record->brand?->name,
            __('catalog.global_search.price') => Currency::format((float) $record->price, 'USD'),
            __('catalog.global_search.stock') => (string) $record->stock,
        ];
    }

    public static function getGlobalSearchResultActions(Model $record): array
    {
        return [
            Action::make('edit')->label(Text::action('edit'))->icon('pencil')->url(static::getUrl('edit', ['record' => $record])),
            Action::make('view')->label(Text::action('view'))->icon('eye')->url(static::getUrl('view', ['record' => $record])),
        ];
    }

    public static function getGlobalSearchEloquentQuery(): EloquentBuilder
    {
        return parent::getGlobalSearchEloquentQuery()->with('brand');
    }

    // ---------------------------------------------------------------- Helpers

    /** Managers (and admins) may change prices, costs and the featured flag. */
    public static function viewerIsManager(): bool
    {
        $user = alfakit()->auth();

        return $user instanceof User && $user->isManager();
    }

    /** `MA-{STORE}-{NNNN}`: the next free sequence number in the current store. */
    public static function nextSku(): string
    {
        $tenant = alfakit()->getTenant();
        $prefix = 'MA-'.Str::upper(Str::substr((string) ($tenant?->getAttribute('slug') ?? 'shop'), 0, 3)).'-';
        $last = Product::withTrashed()
            ->where('sku', 'like', $prefix.'%')
            ->get(['sku'])
            ->map(fn (Product $product): int => (int) preg_replace('/\D/', '', Str::afterLast($product->sku, '-')))
            ->max();

        return $prefix.str_pad((string) (($last ?? 0) + 1), 4, '0', STR_PAD_LEFT);
    }
}
