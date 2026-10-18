<?php

declare(strict_types=1);

namespace App\Alfakit\Resources;

use AlfaSix\Alfakit\Forms\Components\FileUpload;
use AlfaSix\Alfakit\Forms\Components\KeyValue;
use AlfaSix\Alfakit\Forms\Components\MoneyInput;
use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Forms\Components\Textarea;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Forms\Components\Toggle;
use AlfaSix\Alfakit\Resources\Resource;
use AlfaSix\Alfakit\Schemas\Components\Grid;
use AlfaSix\Alfakit\Schemas\Components\Section;
use AlfaSix\Alfakit\Schemas\Components\Utilities\Get;
use AlfaSix\Alfakit\Schemas\Schema;
use App\Alfakit\Resources\SettingResource\Pages;
use App\Demo\Nav;
use App\Models\Setting;
use App\Models\Store;

/**
 * Store settings as a singular resource: one record per store, edited on a single page that
 * creates it on the first save. The "Store" section writes to the tenant record itself
 * through a BelongsTo relationship section.
 */
class SettingResource extends Resource
{
    protected static ?string $model = Setting::class;

    protected static ?string $navigationIcon = 'demo::settings';

    protected static ?int $navigationSort = 1;

    public static function getNavigationGroup(): ?string
    {
        return Nav::group(Nav::SETTINGS);
    }

    public static function getModelLabel(): string
    {
        return __('platform.settings.label');
    }

    public static function getPluralModelLabel(): string
    {
        return __('platform.settings.plural');
    }

    public static function form(Schema $schema): Schema
    {
        $tenant = alfakit()->getTenant();
        $currency = $tenant instanceof Store ? $tenant->currency : 'USD';

        return $schema->components([
            Section::make(__('platform.settings.sections.store'))
                ->description(__('platform.settings.sections.store_description'))
                ->icon('store')
                ->relationship('store')
                ->columns(['default' => 1, 'md' => 2])
                ->schema([
                    TextInput::make('name')
                        ->label(__('platform.settings.fields.name'))
                        ->required()
                        ->maxLength(80),
                    TextInput::make('tagline')
                        ->label(__('platform.settings.fields.tagline'))
                        ->maxLength(120),
                    Select::make('currency')
                        ->label(__('platform.settings.fields.currency'))
                        ->currencies()
                        ->searchable()
                        ->required(),
                    Select::make('timezone')
                        ->label(__('platform.settings.fields.timezone'))
                        ->options(array_combine(timezone_identifiers_list(), timezone_identifiers_list()))
                        ->searchable()
                        ->required(),
                    FileUpload::make('logo_path')
                        ->label(__('platform.settings.fields.logo'))
                        ->helperText(__('platform.settings.fields.logo_help'))
                        ->image()
                        ->disk('demo')
                        ->directory('stores')
                        ->maxSize(1024)
                        ->imagePreviewHeight(96)
                        ->columnSpanFull(),
                ]),

            Section::make(__('platform.settings.sections.orders'))
                ->description(__('platform.settings.sections.orders_description'))
                ->icon('receipt')
                ->columns(['default' => 1, 'md' => 2])
                ->schema([
                    TextInput::make('order_prefix')
                        ->label(__('platform.settings.fields.order_prefix'))
                        ->helperText(fn (Get $get): string => __('platform.settings.fields.order_prefix_help', ['example' => ($get('order_prefix') ?: 'MA').'-MAN-00042']))
                        ->live(onBlur: true)
                        ->required()
                        ->rules(['alpha_num'])
                        ->maxLength(6),
                    TextInput::make('tax_rate')
                        ->label(__('platform.settings.fields.tax_rate'))
                        ->numeric()
                        ->minValue(0)
                        ->maxValue(100)
                        ->step(0.5)
                        ->suffix('%')
                        ->required(),
                    MoneyInput::make('free_shipping_threshold')
                        ->label(__('platform.settings.fields.free_shipping_threshold'))
                        ->currency($currency)
                        ->minValue(0)
                        ->required(),
                    TextInput::make('low_stock_threshold')
                        ->label(__('platform.settings.fields.low_stock_threshold'))
                        ->helperText(__('platform.settings.fields.low_stock_help'))
                        ->numeric()
                        ->integer()
                        ->minValue(0)
                        ->maxValue(1000)
                        ->required(),
                ]),

            Section::make(__('platform.settings.sections.notifications'))
                ->description(__('platform.settings.sections.notifications_description'))
                ->icon('bell')
                ->schema([
                    Toggle::make('notify_on_new_order')
                        ->label(__('platform.settings.fields.notify_on_new_order'))
                        ->onIcon('bell-ring')
                        ->offIcon('bell-off'),
                    Toggle::make('reviews_require_approval')
                        ->label(__('platform.settings.fields.reviews_require_approval'))
                        ->onIcon('shield-check'),
                ]),

            Section::make(__('platform.settings.sections.storefront'))
                ->description(__('platform.settings.sections.storefront_description'))
                ->icon('demo::store')
                ->schema([
                    Textarea::make('welcome_message')
                        ->label(__('platform.settings.fields.welcome_message'))
                        ->helperText(__('platform.settings.fields.welcome_help'))
                        ->translatable()
                        ->rows(3)
                        ->maxLength(300),
                    TextInput::make('announcement')
                        ->label(__('platform.settings.fields.announcement'))
                        ->maxLength(160),
                    Grid::make(['default' => 1, 'md' => 2])->schema([
                        TextInput::make('support_email')
                            ->label(__('platform.settings.fields.support_email'))
                            ->email()
                            ->maxLength(120),
                        TextInput::make('support_phone')
                            ->label(__('platform.settings.fields.support_phone'))
                            ->tel()
                            ->maxLength(40),
                        KeyValue::make('social')
                            ->label(__('platform.settings.fields.social'))
                            ->keyLabel(__('platform.settings.fields.social_key'))
                            ->valueLabel(__('platform.settings.fields.social_value'))
                            ->reorderable(),
                        KeyValue::make('opening_hours')
                            ->label(__('platform.settings.fields.opening_hours'))
                            ->keyLabel(__('platform.settings.fields.opening_hours_key'))
                            ->valueLabel(__('platform.settings.fields.opening_hours_value')),
                    ]),
                ]),
        ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ManageSettings::route('/'),
        ];
    }
}
