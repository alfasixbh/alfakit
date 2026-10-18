<?php

declare(strict_types=1);

namespace App\Alfakit\Tenancy;

use AlfaSix\Alfakit\Forms\Components\ColorPicker;
use AlfaSix\Alfakit\Forms\Components\FileUpload;
use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Forms\Components\Toggle;
use AlfaSix\Alfakit\Schemas\Components\Section;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Tenancy\Pages\EditTenantProfile;
use App\Models\Store;
use App\Models\User;

/**
 * Tenant profile: "Store profile" in the store menu edits the current `Store` record. Only
 * owners of the store (and admins) may open it; `TenantPolicy::update` says the same.
 */
class EditStore extends EditTenantProfile
{
    public static function getLabel(): string
    {
        return __('platform.tenancy.profile.label');
    }

    public static function canAccess(): bool
    {
        $user = auth()->user();
        $tenant = alfakit()->getTenant();

        return $user instanceof User && $tenant instanceof Store && $user->can('update', $tenant);
    }

    public function getSubheading(): ?string
    {
        return __('platform.tenancy.profile.description');
    }

    public function form(Schema $schema): Schema
    {
        $tenant = alfakit()->getTenant();
        $slug = $tenant instanceof Store ? $tenant->slug : 'store';

        return $schema->components([
            Section::make(__('platform.tenancy.register.sections.identity'))
                ->icon('demo::store')
                ->columns(['default' => 1, 'md' => 2])
                ->schema([
                    TextInput::make('name')
                        ->label(__('platform.tenancy.register.name'))
                        ->required()
                        ->maxLength(80),
                    TextInput::make('slug')
                        ->label(__('platform.tenancy.register.slug'))
                        ->helperText(__('platform.tenancy.register.slug_help', ['slug' => $slug]))
                        ->disabled()
                        ->dehydrated(false),
                    TextInput::make('tagline')
                        ->label(__('platform.tenancy.register.tagline'))
                        ->maxLength(120)
                        ->columnSpanFull(),
                    FileUpload::make('logo_path')
                        ->label(__('platform.tenancy.profile.logo'))
                        ->image()
                        ->disk('demo')
                        ->directory('stores/'.$slug)
                        ->acceptedFileTypes(['image/svg+xml', 'image/png', 'image/jpeg'])
                        ->maxSize(1024)
                        ->columnSpanFull(),
                    TextInput::make('city')
                        ->label(__('platform.tenancy.register.city'))
                        ->required()
                        ->maxLength(60),
                    TextInput::make('country')
                        ->label(__('platform.tenancy.register.country'))
                        ->required()
                        ->rules(['size:2', 'alpha']),
                    TextInput::make('email')
                        ->label(__('platform.tenancy.profile.email'))
                        ->email()
                        ->maxLength(120),
                    TextInput::make('phone')
                        ->label(__('platform.tenancy.profile.phone'))
                        ->tel()
                        ->maxLength(30),
                ]),
            Section::make(__('platform.tenancy.register.sections.locale'))
                ->icon('globe')
                ->columns(['default' => 1, 'md' => 3])
                ->schema([
                    Select::make('currency')
                        ->label(__('platform.tenancy.register.currency'))
                        ->currencies()
                        ->searchable()
                        ->required(),
                    Select::make('timezone')
                        ->label(__('platform.tenancy.register.timezone'))
                        ->options(array_combine(timezone_identifiers_list(), timezone_identifiers_list()))
                        ->searchable()
                        ->required(),
                    ColorPicker::make('brand_color')
                        ->label(__('platform.tenancy.register.brand_color'))
                        ->hex()
                        ->required(),
                    Toggle::make('is_active')
                        ->label(__('platform.tenancy.profile.is_active'))
                        ->helperText(__('platform.tenancy.profile.is_active_help'))
                        ->columnSpanFull(),
                ]),
        ]);
    }
}
