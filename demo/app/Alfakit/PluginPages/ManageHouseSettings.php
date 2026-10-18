<?php

declare(strict_types=1);

namespace App\Alfakit\PluginPages;

use AlfaSix\Alfakit\Forms\Components\TagsInput;
use AlfaSix\Alfakit\Forms\Components\Textarea;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Forms\Components\Toggle;
use AlfaSix\Alfakit\Forms\Components\ToggleButtons;
use AlfaSix\Alfakit\Schemas\Components\Section;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\AlfakitSettings\Pages\SettingsPage;
use App\Demo\Access;
use App\Settings\MaisonSettings;

/**
 * House-wide settings (alfasix/alfakit-settings): shared by every store, unlike the per-store
 * "Store settings" resource. The storefront shows the announcement. Owners only.
 */
class ManageHouseSettings extends SettingsPage
{
    protected static string $settings = MaisonSettings::class;

    protected static ?string $slug = 'house-settings';

    protected static ?string $navigationIcon = 'sliders-horizontal';

    protected static ?int $navigationSort = 15;

    public static function getNavigationLabel(): string
    {
        return __('plugins.settings.title');
    }

    public function getTitle(): string
    {
        return __('plugins.settings.title');
    }

    public function getSubheading(): ?string
    {
        return __('plugins.settings.subheading');
    }

    public static function canAccess(): bool
    {
        return Access::owner(alfakit()->auth());
    }

    public function form(Schema $schema): Schema
    {
        return $schema->components([
            Section::make(__('plugins.settings.sections.brand'))->icon('store')->schema([
                TextInput::make('house_name')->label(__('plugins.settings.fields.house_name'))->required()->maxLength(60),
                Textarea::make('storefront_announcement')->label(__('plugins.settings.fields.announcement'))
                    ->helperText(__('plugins.settings.fields.announcement_help'))->rows(2)->maxLength(140),
                TextInput::make('support_hours')->label(__('plugins.settings.fields.support_hours'))->required()->maxLength(80),
                ToggleButtons::make('price_display')->label(__('plugins.settings.fields.price_display'))
                    ->options([
                        'tax_inclusive' => __('plugins.settings.price_display.tax_inclusive'),
                        'tax_exclusive' => __('plugins.settings.price_display.tax_exclusive'),
                    ])->inline()->required(),
            ])->columns(2),
            Section::make(__('plugins.settings.sections.notifications'))->icon('bell')->schema([
                Toggle::make('low_stock_alerts')->label(__('plugins.settings.fields.low_stock_alerts')),
                Toggle::make('weekly_report')->label(__('plugins.settings.fields.weekly_report')),
                TagsInput::make('report_recipients')->label(__('plugins.settings.fields.report_recipients'))
                    ->helperText(__('plugins.settings.fields.report_recipients_help'))
                    ->nestedRecursiveRules(['email:rfc', 'max:120'])->columnSpanFull(),
            ])->columns(2),
        ]);
    }
}
