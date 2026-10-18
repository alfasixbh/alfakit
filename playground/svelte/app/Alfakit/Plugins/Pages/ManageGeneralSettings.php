<?php

declare(strict_types=1);

namespace App\Alfakit\Plugins\Pages;

use AlfaSix\Alfakit\Forms\Components\TagsInput;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Forms\Components\Toggle;
use AlfaSix\Alfakit\Schemas\Components\Section;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\AlfakitSettings\Pages\SettingsPage;
use App\Settings\GeneralSettings;

/** alfasix/alfakit-settings: edits App\Settings\GeneralSettings (spatie/laravel-settings). */
class ManageGeneralSettings extends SettingsPage
{
    protected static string $settings = GeneralSettings::class;

    protected static ?string $navigationIcon = 'settings';

    protected static ?string $slug = 'general-settings';

    protected static ?int $navigationSort = 50;

    public static function getNavigationLabel(): string
    {
        return __('playground.nav.general_settings');
    }

    public function form(Schema $schema): Schema
    {
        return $schema->components([
            Section::make(__('playground.sections.site'))->schema([
                TextInput::make('site_name')->label(__('playground.fields.site_name'))->required()->maxLength(100),
                TextInput::make('tagline')->label(__('playground.fields.tagline'))->maxLength(255),
                TextInput::make('support_email')->label(__('playground.fields.support_email'))->email()->required(),
            ])->columns(1),
            Section::make(__('playground.sections.content'))->schema([
                TextInput::make('posts_per_page')->label(__('playground.fields.posts_per_page'))->numeric()->integer()->minValue(1)->maxValue(100)->required(),
                TagsInput::make('allowed_locales')->label(__('playground.fields.allowed_locales')),
                Toggle::make('maintenance_mode')->label(__('playground.fields.maintenance_mode')),
            ])->columns(1),
        ])->columns(2);
    }
}
