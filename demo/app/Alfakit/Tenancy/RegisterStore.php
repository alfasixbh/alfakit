<?php

declare(strict_types=1);

namespace App\Alfakit\Tenancy;

use AlfaSix\Alfakit\Forms\Components\ColorPicker;
use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Schemas\Components\Section;
use AlfaSix\Alfakit\Schemas\Components\Utilities\Set;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Tenancy\Pages\RegisterTenant;
use App\Enums\StaffRole;
use App\Models\Setting;
use App\Models\Store;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Tenant registration: "Open a new store" in the store menu. The signed-in user becomes the
 * owner and the panel redirects to the new tenant.
 */
class RegisterStore extends RegisterTenant
{
    public static function getLabel(): string
    {
        return __('platform.tenancy.register.label');
    }

    public function getSubheading(): ?string
    {
        return __('platform.tenancy.register.description');
    }

    public function form(Schema $schema): Schema
    {
        return $schema->components([
            Section::make(__('platform.tenancy.register.sections.identity'))
                ->icon('demo::store')
                ->columns(['default' => 1, 'md' => 2])
                ->schema([
                    TextInput::make('name')
                        ->label(__('platform.tenancy.register.name'))
                        ->required()
                        ->maxLength(80)
                        ->live(onBlur: true)
                        ->afterStateUpdated(fn (Set $set, ?string $state) => $set('slug', Str::slug((string) $state))),
                    TextInput::make('slug')
                        ->label(__('platform.tenancy.register.slug'))
                        ->helperText(__('platform.tenancy.register.slug_help', ['slug' => 'manama']))
                        ->required()
                        ->rules(['alpha_dash'])
                        ->maxLength(60)
                        ->unique(Store::class, 'slug'),
                    TextInput::make('tagline')
                        ->label(__('platform.tenancy.register.tagline'))
                        ->maxLength(120)
                        ->columnSpanFull(),
                    TextInput::make('city')
                        ->label(__('platform.tenancy.register.city'))
                        ->required()
                        ->maxLength(60),
                    TextInput::make('country')
                        ->label(__('platform.tenancy.register.country'))
                        ->required()
                        ->rules(['size:2', 'alpha'])
                        ->default('BH'),
                ]),
            Section::make(__('platform.tenancy.register.sections.locale'))
                ->icon('globe')
                ->columns(['default' => 1, 'md' => 3])
                ->schema([
                    Select::make('currency')
                        ->label(__('platform.tenancy.register.currency'))
                        ->currencies()
                        ->searchable()
                        ->default('USD')
                        ->required(),
                    Select::make('timezone')
                        ->label(__('platform.tenancy.register.timezone'))
                        ->options(array_combine(timezone_identifiers_list(), timezone_identifiers_list()))
                        ->searchable()
                        ->default('Asia/Bahrain')
                        ->required(),
                    ColorPicker::make('brand_color')
                        ->label(__('platform.tenancy.register.brand_color'))
                        ->hex()
                        ->default('#073B78')
                        ->required(),
                ]),
        ]);
    }

    protected function handleRegistration(array $data): Model
    {
        $user = auth()->user();

        abort_unless($user instanceof User, 403);

        $store = Store::query()->create([
            'name' => $data['name'],
            'slug' => $data['slug'],
            'tagline' => $data['tagline'] ?? null,
            'city' => $data['city'],
            'currency' => $data['currency'],
            'timezone' => $data['timezone'],
            'brand_color' => $data['brand_color'],
            'country' => Str::upper((string) $data['country']),
            'email' => $data['slug'].'@maison-alfa.test',
            'is_active' => true,
        ]);

        $store->users()->attach($user, ['role' => StaffRole::Owner->value]);

        Setting::query()->create([
            'store_id' => $store->id,
            'order_prefix' => Str::upper(Str::substr((string) $data['slug'], 0, 3)),
        ]);

        Notification::make()->success()->title(__('platform.tenancy.register.created', ['store' => $store->name]))->send();

        return $store;
    }
}
