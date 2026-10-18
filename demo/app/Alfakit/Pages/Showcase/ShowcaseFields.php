<?php

declare(strict_types=1);

namespace App\Alfakit\Pages\Showcase;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Forms\Components\Builder;
use AlfaSix\Alfakit\Forms\Components\Builder\Block;
use AlfaSix\Alfakit\Forms\Components\Checkbox;
use AlfaSix\Alfakit\Forms\Components\CheckboxList;
use AlfaSix\Alfakit\Forms\Components\CodeEditor;
use AlfaSix\Alfakit\Forms\Components\CodeEditor\Enums\Language;
use AlfaSix\Alfakit\Forms\Components\ColorPicker;
use AlfaSix\Alfakit\Forms\Components\DatePicker;
use AlfaSix\Alfakit\Forms\Components\DateTimePicker;
use AlfaSix\Alfakit\Forms\Components\FileUpload;
use AlfaSix\Alfakit\Forms\Components\Hidden;
use AlfaSix\Alfakit\Forms\Components\KeyValue;
use AlfaSix\Alfakit\Forms\Components\MarkdownEditor;
use AlfaSix\Alfakit\Forms\Components\ModalTableSelect;
use AlfaSix\Alfakit\Forms\Components\MoneyInput;
use AlfaSix\Alfakit\Forms\Components\Radio;
use AlfaSix\Alfakit\Forms\Components\Repeater;
use AlfaSix\Alfakit\Forms\Components\Repeater\TableColumn;
use AlfaSix\Alfakit\Forms\Components\RichEditor;
use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Forms\Components\Slider;
use AlfaSix\Alfakit\Forms\Components\TagsInput;
use AlfaSix\Alfakit\Forms\Components\Textarea;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Forms\Components\TimePicker;
use AlfaSix\Alfakit\Forms\Components\Toggle;
use AlfaSix\Alfakit\Forms\Components\ToggleButtons;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Schemas\Components\Section;
use AlfaSix\Alfakit\Schemas\Components\Utilities\Get;
use AlfaSix\Alfakit\Schemas\Components\Utilities\Set;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Support\TenantScope;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Table;
use App\Demo\Catalog;
use App\Enums\Concentration;
use App\Models\Brand;
use App\Models\Product;
use Illuminate\Support\Str;

/**
 * Showcase: every form field on one page, filled with a realistic product launch. Nothing
 * is saved; "Validate" runs the server-side rules and reports back.
 */
class ShowcaseFields extends ShowcasePage
{
    protected static string $key = 'fields';

    protected static ?string $navigationIcon = 'text-cursor-input';

    protected static ?int $navigationSort = 1;

    public function mount(mixed ...$parameters): void
    {
        $this->formData = [
            'name' => 'Amber Meridian',
            'slug' => 'amber-meridian',
            'sku' => 'MA-AMB-050',
            'tagline' => ['en' => 'Golden hour in a bottle.', 'ar' => 'ساعة الذهب في زجاجة.'],
            'story' => ['en' => 'Saffron and pink pepper over a heart of Damask rose; amber, oud and tonka to finish.', 'ar' => 'زعفران وفلفل وردي فوق قلب من الورد الدمشقي؛ عنبر وعود وتونكا في الختام.'],
            'currency' => 'USD',
            'price' => 18500,
            'compare_at_price' => null,
            'margin' => 62,
            'size_range' => [30, 100],
            'concentration' => Concentration::EauDeParfum->value,
            'audience' => 'unisex',
            'channels' => ['web', 'boutique'],
            'featured' => true,
            'gift_wrap' => false,
            'launch_at' => now()->addDays(21)->setTime(10, 0)->toIso8601String(),
            'preorder_from' => now()->addDays(7)->toDateString(),
            'boutique_opens' => '10:00',
            'accent_color' => '#F47A22',
            'notes' => ['saffron', 'pink pepper', 'Damask rose', 'amber'],
            'specs' => ['Bottle' => 'Hand-polished glass, 50 ml', 'Cap' => 'Walnut', 'Origin' => 'Grasse, France'],
            'release_notes' => "## Launch checklist\n\n- Photography approved\n- Boutique staff briefed\n- Newsletter scheduled",
            'description' => '<p><strong>Amber Meridian</strong> opens with saffron and pink pepper, settles into a heart of Damask rose and dries down to amber and oud.</p>',
            'config' => "{\n  \"shelf\": \"A3\",\n  \"reorderPoint\": 12,\n  \"sampleSizes\": [2, 8]\n}\n",
            'variants' => [
                ['name' => '30 ml', 'size_ml' => 30, 'price' => 11500, 'stock' => 40],
                ['name' => '50 ml', 'size_ml' => 50, 'price' => 18500, 'stock' => 65],
                ['name' => '100 ml', 'size_ml' => 100, 'price' => 29000, 'stock' => 20],
            ],
            'page' => [
                ['type' => 'heading', 'data' => ['text' => 'Amber Meridian', 'level' => 'h2']],
                ['type' => 'paragraph', 'data' => ['text' => 'A warm, resinous composition made for evenings and cool weather.']],
                ['type' => 'quote', 'data' => ['text' => 'Compliments all day.', 'author' => 'A customer in Manama']],
            ],
            'internal_ref' => Str::ulid()->toBase32(),
        ];
    }

    public function form(Schema $schema): Schema
    {
        return $schema->components([
            Section::make(self::t('sections.identity'))
                ->description(self::t('sections.identity_help'))
                ->icon('tag')
                ->schema([
                    TextInput::make('name')
                        ->label(self::t('fields.name'))
                        ->required()
                        ->maxLength(90)
                        ->live(onBlur: true)
                        ->afterStateUpdated(fn (Set $set, ?string $state) => $set('slug', Str::slug((string) $state))),
                    TextInput::make('slug')
                        ->label(self::t('fields.slug'))
                        ->prefix('/products/')
                        ->required()
                        ->rule('alpha_dash')
                        ->suffixAction(
                            Action::make('regenerate')
                                ->label(self::t('actions.regenerate'))
                                ->icon('sparkles')
                                ->iconButton()
                                ->action(fn (Get $get, Set $set) => $set('slug', Str::slug((string) $get('name')))),
                        ),
                    TextInput::make('sku')
                        ->label(self::t('fields.sku'))
                        ->required()
                        ->mask('AA-AAA-000')
                        ->placeholder('MA-AMB-050')
                        ->helperText(self::t('fields.sku_help')),
                    Select::make('brand_id')
                        ->label(self::t('fields.brand'))
                        ->options(fn (): array => Brand::query()->orderBy('name')->pluck('name', 'id')->all())
                        ->searchable()
                        ->native(false)
                        ->createOptionForm([
                            TextInput::make('name')->label(self::t('fields.brand_name'))->required()->maxLength(80),
                        ])
                        ->createOptionUsing(fn (array $data): int => Brand::query()->create(['name' => $data['name'], 'slug' => Str::slug($data['name'])])->getKey()),
                    TextInput::make('tagline')
                        ->label(self::t('fields.tagline'))
                        ->translatable()
                        ->maxLength(120)
                        ->columnSpanFull(),
                    Textarea::make('story')
                        ->label(self::t('fields.story'))
                        ->translatable()
                        ->rows(3)
                        ->autosize()
                        ->columnSpanFull(),
                    Hidden::make('internal_ref'),
                ])->columns(['default' => 1, '@md' => 2]),

            Section::make(self::t('sections.pricing'))
                ->description(self::t('sections.pricing_help'))
                ->icon('banknote')
                ->schema([
                    Select::make('currency')
                        ->label(self::t('fields.currency'))
                        ->options(['USD' => 'USD', 'BHD' => 'BHD', 'EUR' => 'EUR', 'GBP' => 'GBP'])
                        ->native(false)
                        ->live(),
                    MoneyInput::make('price')
                        ->label(self::t('fields.price'))
                        ->currency(fn (Get $get): string => (string) ($get('currency') ?? 'USD'))
                        ->minorUnits()
                        ->required()
                        ->minValue(1),
                    MoneyInput::make('compare_at_price')
                        ->label(self::t('fields.compare_at'))
                        ->currency(fn (Get $get): string => (string) ($get('currency') ?? 'USD'))
                        ->minorUnits()
                        ->rule('gt:price')
                        ->helperText(self::t('fields.compare_at_help')),
                    Slider::make('margin')
                        ->label(self::t('fields.margin'))
                        ->range(minValue: 0, maxValue: 100)
                        ->step(1)
                        ->tooltips()
                        ->fillTrack(),
                    Slider::make('size_range')
                        ->label(self::t('fields.size_range'))
                        ->range(minValue: 5, maxValue: 200)
                        ->step(5)
                        ->minDifference(20)
                        ->tooltips()
                        ->pips()
                        ->columnSpanFull(),
                ])->columns(['default' => 1, '@md' => 2, '@xl' => 4]),

            Section::make(self::t('sections.choices'))
                ->description(self::t('sections.choices_help'))
                ->icon('list-checks')
                ->schema([
                    ToggleButtons::make('concentration')
                        ->label(self::t('fields.concentration'))
                        ->options(Concentration::options())
                        ->colors(collect(Concentration::cases())->mapWithKeys(fn (Concentration $case): array => [$case->value => $case->getColor()])->all())
                        ->icons(collect(Concentration::cases())->mapWithKeys(fn (Concentration $case): array => [$case->value => $case->getIcon()])->all())
                        ->inline()
                        ->required()
                        ->columnSpanFull(),
                    Radio::make('audience')
                        ->label(self::t('fields.audience'))
                        ->options(['unisex' => __('demo.audience.unisex'), 'women' => __('demo.audience.women'), 'men' => __('demo.audience.men')])
                        ->inline(),
                    CheckboxList::make('channels')
                        ->label(self::t('fields.channels'))
                        ->options(['web' => self::t('options.channel_web'), 'boutique' => self::t('options.channel_boutique'), 'wholesale' => self::t('options.channel_wholesale'), 'marketplace' => self::t('options.channel_marketplace')])
                        ->gridColumns(2)
                        ->bulkToggleable(),
                    Toggle::make('featured')
                        ->label(self::t('fields.featured'))
                        ->onIcon('star')
                        ->offIcon('star-off')
                        ->onColor('warning')
                        ->inline(false),
                    Checkbox::make('gift_wrap')
                        ->label(self::t('fields.gift_wrap'))
                        ->helperText(self::t('fields.gift_wrap_help')),
                    ToggleButtons::make('restock')
                        ->label(self::t('fields.restock'))
                        ->boolean()
                        ->grouped()
                        ->default(true),
                ])->columns(['default' => 1, '@md' => 2, '@xl' => 3]),

            Section::make(self::t('sections.schedule'))
                ->description(self::t('sections.schedule_help'))
                ->icon('calendar-clock')
                ->schema([
                    DateTimePicker::make('launch_at')
                        ->label(self::t('fields.launch_at'))
                        ->timezone(fn (): string => alfakit()->getTenant()?->getAttribute('timezone') ?? 'Asia/Bahrain')
                        ->seconds(false)
                        ->minDate(now())
                        ->required()
                        ->helperText(self::t('fields.launch_at_help', ['timezone' => alfakit()->getTenant()?->getAttribute('timezone') ?? 'Asia/Bahrain'])),
                    DatePicker::make('preorder_from')
                        ->label(self::t('fields.preorder_from'))
                        ->native(false)
                        ->closeOnDateSelection()
                        ->before('launch_at'),
                    TimePicker::make('boutique_opens')
                        ->label(self::t('fields.boutique_opens'))
                        ->seconds(false),
                    ColorPicker::make('accent_color')
                        ->label(self::t('fields.accent_color'))
                        ->hex()
                        ->helperText(self::t('fields.accent_color_help')),
                ])->columns(['default' => 1, '@md' => 2, '@xl' => 4]),

            Section::make(self::t('sections.content'))
                ->description(self::t('sections.content_help'))
                ->icon('pen-line')
                ->schema([
                    TagsInput::make('notes')
                        ->label(self::t('fields.notes'))
                        ->suggestions([...Catalog::NOTES['top'], ...Catalog::NOTES['heart'], ...Catalog::NOTES['base']])
                        ->reorderable()
                        ->color('info'),
                    KeyValue::make('specs')
                        ->label(self::t('fields.specs'))
                        ->keyLabel(self::t('fields.spec_key'))
                        ->valueLabel(self::t('fields.spec_value'))
                        ->reorderable(),
                    RichEditor::make('description')
                        ->label(self::t('fields.description'))
                        ->columnSpanFull(),
                    MarkdownEditor::make('release_notes')
                        ->label(self::t('fields.release_notes')),
                    CodeEditor::make('config')
                        ->label(self::t('fields.config'))
                        ->language(Language::Json)
                        ->maxHeight(220)
                        ->json(),
                    FileUpload::make('gallery')
                        ->label(self::t('fields.gallery'))
                        ->image()
                        ->multiple()
                        ->maxFiles(4)
                        ->maxSize(2048)
                        ->directory('showcase')
                        ->reorderable()
                        ->panelLayout('grid')
                        ->helperText(self::t('fields.gallery_help'))
                        ->columnSpanFull(),
                ])->columns(['default' => 1, '@md' => 2]),

            Section::make(self::t('sections.relations'))
                ->description(self::t('sections.relations_help'))
                ->icon('link')
                ->schema([
                    ModalTableSelect::make('pairs_with')
                        ->label(self::t('fields.pairs_with'))
                        ->tableConfiguration(fn (Table $table): Table => $table
                            ->query(TenantScope::apply(Product::query()->with('brand')))
                            ->columns([
                                TextColumn::make('name')->label(self::t('fields.name'))->searchable()->sortable(),
                                TextColumn::make('brand.name')->label(self::t('fields.brand')),
                                TextColumn::make('price')->label(self::t('fields.price'))->money('USD')->alignEnd(),
                            ])
                            ->defaultSort('name'))
                        ->recordTitleAttribute('name')
                        ->multiple()
                        ->maxItems(3)
                        ->helperText(self::t('fields.pairs_with_help'))
                        ->columnSpanFull(),
                    Repeater::make('variants')
                        ->label(self::t('fields.variants'))
                        ->table([
                            TableColumn::make(self::t('fields.variant_name')),
                            TableColumn::make(self::t('fields.variant_size')),
                            TableColumn::make(self::t('fields.price')),
                            TableColumn::make(self::t('fields.stock')),
                        ])
                        ->schema([
                            TextInput::make('name')->required()->maxLength(40),
                            TextInput::make('size_ml')->numeric()->integer()->minValue(1)->suffix('ml'),
                            MoneyInput::make('price')->currency('USD')->minorUnits()->required(),
                            TextInput::make('stock')->numeric()->integer()->minValue(0)->required(),
                        ])
                        ->reorderable()
                        ->cloneable()
                        ->minItems(1)
                        ->maxItems(6)
                        ->columnSpanFull(),
                    Builder::make('page')
                        ->label(self::t('fields.page'))
                        ->blocks([
                            Block::make('heading')
                                ->label(self::t('blocks.heading'))
                                ->icon('heading')
                                ->schema([
                                    TextInput::make('text')->label(self::t('blocks.text'))->required()->maxLength(120),
                                    Select::make('level')->label(self::t('blocks.level'))->options(['h2' => 'H2', 'h3' => 'H3'])->default('h2')->native(false),
                                ])
                                ->columns(2),
                            Block::make('paragraph')
                                ->label(self::t('blocks.paragraph'))
                                ->icon('text')
                                ->schema([Textarea::make('text')->label(self::t('blocks.text'))->required()->rows(3)]),
                            Block::make('quote')
                                ->label(self::t('blocks.quote'))
                                ->icon('quote')
                                ->schema([
                                    Textarea::make('text')->label(self::t('blocks.text'))->required()->rows(2),
                                    TextInput::make('author')->label(self::t('blocks.author'))->maxLength(80),
                                ]),
                            Block::make('image')
                                ->label(self::t('blocks.image'))
                                ->icon('image')
                                ->maxItems(2)
                                ->schema([
                                    FileUpload::make('file')->label(self::t('blocks.image'))->image()->directory('showcase')->maxSize(2048),
                                    TextInput::make('caption')->label(self::t('blocks.caption'))->maxLength(120),
                                ]),
                        ])
                        ->blockPickerColumns(2)
                        ->collapsible()
                        ->cloneable()
                        ->columnSpanFull(),
                ]),
        ]);
    }

    protected function getFormActions(): array
    {
        return [
            Action::make('validate')
                ->label(self::t('actions.validate'))
                ->icon('circle-check')
                ->button()
                ->keyBindings(['mod+s'])
                ->form(fn (): array => $this->getForm()?->getComponents(withHidden: true) ?? [])
                ->action(function (array $data): void {
                    Notification::make()
                        ->title(self::t('notifications.valid_title'))
                        ->body(self::t('notifications.valid_body', [
                            'name' => (string) ($data['name'] ?? ''),
                            'variants' => count($data['variants'] ?? []),
                            'blocks' => count($data['page'] ?? []),
                        ]))
                        ->success()
                        ->send();
                }),
            Action::make('reset')
                ->label(self::t('actions.reset'))
                ->icon('rotate-ccw')
                ->color('gray')
                ->button()
                ->outlined()
                ->url(fn (): string => static::getUrl()),
        ];
    }
}
