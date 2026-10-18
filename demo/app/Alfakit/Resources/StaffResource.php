<?php

declare(strict_types=1);

namespace App\Alfakit\Resources;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Actions\BulkAction;
use AlfaSix\Alfakit\Actions\EditAction;
use AlfaSix\Alfakit\Actions\ImpersonateAction;
use AlfaSix\Alfakit\Auth\EmailChange\EmailChangeVerification;
use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Forms\Components\ToggleButtons;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Resources\Resource;
use AlfaSix\Alfakit\Schemas\Components\Callout;
use AlfaSix\Alfakit\Schemas\Components\Section;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Tables\Columns\IconColumn;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Filters\SelectFilter;
use AlfaSix\Alfakit\Tables\Filters\TernaryFilter;
use AlfaSix\Alfakit\Tables\Table;
use App\Alfakit\Resources\StaffResource\Pages;
use App\Demo\Nav;
use App\Enums\StaffRole;
use App\Models\Store;
use App\Models\User;
use App\Notifications\StaffInvitation;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Str;

/**
 * The team of the current store. Users have no `store_id` (they belong to several stores
 * through `store_user`), so the resource opts out of automatic tenant scoping and narrows
 * the query itself. The role lives on the pivot: the form edits it with toggle buttons and
 * the pages sync it after saving. `UserPolicy` decides who may edit, remove or impersonate.
 */
class StaffResource extends Resource
{
    protected static ?string $model = User::class;

    protected static bool $isScopedToTenant = false;

    protected static ?string $slug = 'staff';

    protected static ?string $navigationIcon = 'demo::staff';

    protected static ?int $navigationSort = 2;

    protected static ?string $recordTitleAttribute = 'name';

    public static function getNavigationGroup(): ?string
    {
        return Nav::group(Nav::SETTINGS);
    }

    public static function getModelLabel(): string
    {
        return __('platform.staff.label');
    }

    public static function getPluralModelLabel(): string
    {
        return __('platform.staff.plural');
    }

    /** @return Builder<User> */
    public static function getEloquentQuery(): Builder
    {
        $tenant = alfakit()->getTenant();

        return parent::getEloquentQuery()
            ->whereHas('stores', fn (Builder $query) => $query->whereKey($tenant?->getKey()))
            ->withCount('stores');
    }

    public static function form(Schema $schema): Schema
    {
        $tenant = alfakit()->getTenant();
        $store = $tenant instanceof Store ? $tenant->name : '';

        return $schema->components([
            Section::make(__('platform.staff.sections.account'))
                ->icon('user-round')
                ->columns(['default' => 1, 'md' => 2])
                ->schema([
                    TextInput::make('name')
                        ->label(__('platform.staff.fields.name'))
                        ->required()
                        ->maxLength(80),
                    TextInput::make('email')
                        ->label(__('platform.staff.fields.email'))
                        ->email()
                        ->required()
                        ->maxLength(120)
                        ->unique(ignoreRecord: true)
                        ->helperText(__('platform.staff.fields.email_help')),
                    TextInput::make('title')
                        ->label(__('platform.staff.fields.title'))
                        ->maxLength(80),
                    Select::make('locale')
                        ->label(__('platform.staff.fields.locale'))
                        ->options(self::localeOptions())
                        ->native(false),
                    Select::make('timezone')
                        ->label(__('platform.staff.fields.timezone'))
                        ->options(array_combine(timezone_identifiers_list(), timezone_identifiers_list()))
                        ->searchable()
                        ->columnSpanFull(),
                ]),
            Section::make(__('platform.staff.sections.access', ['store' => $store]))
                ->description(__('platform.staff.sections.access_description'))
                ->icon('key-round')
                ->schema([
                    ToggleButtons::make('role')
                        ->label(__('platform.staff.fields.role'))
                        ->options(StaffRole::options())
                        ->icons(self::roleIcons())
                        ->colors(self::roleColors())
                        ->inline()
                        ->required(),
                ]),
            Section::make(__('platform.staff.sections.security'))
                ->icon('demo::security')
                ->schema([
                    Callout::make(__('platform.staff.fields.two_factor'))
                        ->description(fn (?User $record): string => ($record?->hasMultiFactorAuthentication() ?? false)
                            ? __('platform.staff.fields.two_factor_on').' · '.__('platform.staff.fields.two_factor_help')
                            : __('platform.staff.fields.two_factor_off').' · '.__('platform.staff.fields.two_factor_help'))
                        ->info()
                        ->icon('smartphone'),
                    Callout::make(__('platform.staff.fields.email_verified'))
                        ->description(fn (?User $record): string => __('platform.staff.fields.email_pending', [
                            'email' => $record === null ? '' : (EmailChangeVerification::getPendingEmail(alfakit()->getCurrentOrDefaultPanel(), $record) ?? ''),
                        ]))
                        ->warning()
                        ->icon('mail-warning')
                        ->visible(fn (?User $record): bool => $record !== null
                            && EmailChangeVerification::getPendingEmail(alfakit()->getCurrentOrDefaultPanel(), $record) !== null),
                ]),
        ]);
    }

    public static function table(Table $table): Table
    {
        $tenant = alfakit()->getTenant();
        $store = $tenant instanceof Store ? $tenant : null;

        return $table
            ->columns([
                TextColumn::make('name')
                    ->label(__('platform.staff.fields.name'))
                    ->description(fn (User $record): ?string => $record->title)
                    ->weight('medium')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('email')
                    ->label(__('platform.staff.fields.email'))
                    ->icon(fn (User $record): ?string => $record->email_verified_at === null ? 'mail-question' : null)
                    ->searchable()
                    ->copyable()
                    ->visibleFrom('md'),
                TextColumn::make('role')
                    ->label(__('platform.staff.fields.role'))
                    ->getStateUsing(fn (User $record): ?string => $record->roleIn($store)?->getLabel())
                    ->badge()
                    ->color(fn (User $record): string => $record->roleIn($store)?->getColor() ?? 'gray')
                    ->icon(fn (User $record): ?string => $record->roleIn($store)?->getIcon()),
                IconColumn::make('two_factor')
                    ->label(__('platform.staff.fields.two_factor'))
                    ->getStateUsing(fn (User $record): bool => $record->hasMultiFactorAuthentication())
                    ->boolean()
                    ->trueIcon('shield-check')
                    ->falseIcon('shield-off')
                    ->falseColor('gray')
                    ->tooltip(fn (User $record): string => $record->hasMultiFactorAuthentication()
                        ? __('platform.staff.fields.two_factor_on')
                        : __('platform.staff.fields.two_factor_off'))
                    ->alignCenter(),
                TextColumn::make('stores_count')
                    ->label(__('platform.staff.fields.stores'))
                    ->numeric()
                    ->badge()
                    ->color('gray')
                    ->alignCenter()
                    ->visibleFrom('lg'),
                TextColumn::make('invited_at')
                    ->label(__('platform.staff.fields.last_invited'))
                    ->since()
                    ->placeholder('—')
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('created_at')
                    ->label(__('platform.staff.fields.joined'))
                    ->date()
                    ->sortable()
                    ->visibleFrom('xl'),
            ])
            ->filters([
                SelectFilter::make('role')
                    ->label(__('platform.staff.fields.role'))
                    ->options(StaffRole::options())
                    ->query(fn (Builder $query, array $data) => filled($data['value'] ?? null)
                        ? $query->whereHas('stores', fn (Builder $stores) => $stores->whereKey($store?->getKey())->where('store_user.role', $data['value']))
                        : $query),
                TernaryFilter::make('two_factor')
                    ->label(__('platform.staff.fields.two_factor'))
                    ->queries(
                        true: fn (Builder $query) => $query->where(fn (Builder $q) => $q->whereNotNull('app_authentication_secret')->orWhere('has_email_authentication', true)),
                        false: fn (Builder $query) => $query->whereNull('app_authentication_secret')->where('has_email_authentication', false),
                    ),
            ])
            ->recordActions([
                EditAction::make(),
                ImpersonateAction::make(),
                self::changeRoleAction(),
                self::resendInvitationAction(),
                self::removeAction(),
            ])
            ->bulkActions([
                BulkAction::make('changeRole')
                    ->label(__('platform.staff.actions.change_role'))
                    ->icon('key-round')
                    ->form([
                        ToggleButtons::make('role')
                            ->label(__('platform.staff.fields.role'))
                            ->options(StaffRole::options())
                            ->icons(self::roleIcons())
                            ->colors(self::roleColors())
                            ->inline()
                            ->required(),
                    ])
                    ->authorize(fn (): bool => auth()->user()?->isOwner() ?? false)
                    ->deselectRecordsAfterCompletion()
                    ->action(function (Collection $records, array $data): void {
                        $role = StaffRole::from((string) $data['role']);
                        $count = 0;

                        foreach ($records as $record) {
                            if ($record instanceof User && self::canChangeRole($record)) {
                                self::setRole($record, $role);
                                $count++;
                            }
                        }

                        Notification::make()->success()->title(trans_choice('platform.staff.actions.role_changed', $count, ['count' => $count]))->send();
                    }),
            ])
            ->defaultSort('name')
            ->emptyStateIcon('demo::staff');
    }

    public static function inviteAction(): Action
    {
        $tenant = alfakit()->getTenant();
        $store = $tenant instanceof Store ? $tenant->name : '';

        return Action::make('invite')
            ->label(__('platform.staff.actions.invite'))
            ->icon('user-round-plus')
            ->button()
            ->modalHeading(__('platform.staff.actions.invite_heading', ['store' => $store]))
            ->modalDescription(__('platform.staff.actions.invite_description'))
            ->modalSubmitActionLabel(__('platform.staff.actions.invite_submit'))
            ->authorize(fn (): bool => static::canCreate())
            ->rateLimit(5)
            ->form([
                TextInput::make('name')
                    ->label(__('platform.staff.fields.name'))
                    ->required()
                    ->maxLength(80),
                TextInput::make('email')
                    ->label(__('platform.staff.fields.email'))
                    ->email()
                    ->required()
                    ->maxLength(120)
                    ->unique(User::class, 'email'),
                TextInput::make('title')
                    ->label(__('platform.staff.fields.title'))
                    ->maxLength(80),
                ToggleButtons::make('role')
                    ->label(__('platform.staff.fields.role'))
                    ->options(StaffRole::options())
                    ->icons(self::roleIcons())
                    ->colors(self::roleColors())
                    ->inline()
                    ->default(StaffRole::Staff->value)
                    ->required(),
            ])
            ->action(function (array $data): void {
                $tenant = alfakit()->getTenant();
                $inviter = auth()->user();

                abort_unless($tenant instanceof Store && $inviter instanceof User, 403);

                $role = StaffRole::from((string) $data['role']);
                $password = Str::password(12, symbols: false);

                $user = User::query()->create([
                    'name' => $data['name'],
                    'email' => $data['email'],
                    'title' => $data['title'] ?? null,
                    'password' => $password,
                    'locale' => app()->getLocale(),
                    'timezone' => $tenant->timezone,
                    'invited_at' => now(),
                ]);

                $user->stores()->attach($tenant, ['role' => $role->value]);

                $user->notify((new StaffInvitation($tenant, $inviter, $role, $password, alfakit()->getCurrentOrDefaultPanel()->getUrl($tenant)))->locale($user->locale ?? 'en'));

                Notification::make()->success()->title(__('platform.staff.actions.invited', ['email' => $user->email]))->send();
            });
    }

    public static function changeRoleAction(): Action
    {
        return Action::make('changeRole')
            ->label(__('platform.staff.actions.change_role'))
            ->icon('key-round')
            ->color('gray')
            ->fillForm(fn (User $record): array => ['role' => $record->roleIn()?->value])
            ->form([
                ToggleButtons::make('role')
                    ->label(__('platform.staff.fields.role'))
                    ->options(StaffRole::options())
                    ->icons(self::roleIcons())
                    ->colors(self::roleColors())
                    ->inline()
                    ->required(),
            ])
            ->visible(fn (User $record): bool => self::canChangeRole($record))
            ->action(function (User $record, array $data): void {
                self::setRole($record, StaffRole::from((string) $data['role']));

                Notification::make()->success()->title(trans_choice('platform.staff.actions.role_changed', 1, ['count' => 1]))->send();
            });
    }

    public static function resendInvitationAction(): Action
    {
        return Action::make('resendInvitation')
            ->label(__('platform.staff.actions.resend'))
            ->icon('mail-plus')
            ->color('gray')
            ->requiresConfirmation()
            ->rateLimit(5)
            ->visible(fn (User $record): bool => $record->invited_at !== null && $record->email_verified_at === null && static::canEdit($record))
            ->action(function (User $record): void {
                $tenant = alfakit()->getTenant();
                $inviter = auth()->user();

                abort_unless($tenant instanceof Store && $inviter instanceof User, 403);

                $password = Str::password(12, symbols: false);
                $record->forceFill(['password' => $password, 'invited_at' => now()])->save();

                $record->notify((new StaffInvitation($tenant, $inviter, $record->roleIn($tenant) ?? StaffRole::Staff, $password, alfakit()->getCurrentOrDefaultPanel()->getUrl($tenant)))->locale($record->locale ?? 'en'));

                Notification::make()->success()->title(__('platform.staff.actions.resent'))->send();
            });
    }

    public static function removeAction(): Action
    {
        return Action::make('remove')
            ->label(__('platform.staff.actions.remove'))
            ->icon('user-round-x')
            ->color('danger')
            ->requiresConfirmation()
            ->modalDescription(__('platform.staff.actions.remove_description'))
            ->visible(fn (User $record): bool => static::canDelete($record))
            ->action(function (User $record): void {
                $tenant = alfakit()->getTenant();

                abort_unless($tenant instanceof Store, 403);

                $record->stores()->detach($tenant);

                Notification::make()->success()->title(__('platform.staff.actions.removed', ['store' => $tenant->name]))->send();
            });
    }

    /** Owners change roles below their own; nobody changes their own role or an admin's. */
    public static function canChangeRole(User $target): bool
    {
        $user = auth()->user();

        return $user instanceof User && ! $user->is($target) && ! $target->is_admin && static::canEdit($target) && $user->isOwner();
    }

    public static function setRole(User $user, StaffRole $role, ?Store $store = null): void
    {
        $store ??= alfakit()->getTenant();

        if ($store instanceof Store) {
            $user->stores()->updateExistingPivot($store->getKey(), ['role' => $role->value]);
        }
    }

    /** @return array<string, string> */
    public static function roleIcons(): array
    {
        return collect(StaffRole::cases())->mapWithKeys(fn (StaffRole $role): array => [$role->value => $role->getIcon()])->all();
    }

    /** @return array<string, string> */
    public static function roleColors(): array
    {
        return collect(StaffRole::cases())->mapWithKeys(fn (StaffRole $role): array => [$role->value => $role->getColor()])->all();
    }

    /** The panel's locales, each named in its own language. */
    public static function localeOptions(): array
    {
        $options = [];

        foreach (alfakit()->getCurrentOrDefaultPanel()->getLocales() as $locale) {
            $options[$locale->getCode()] = $locale->getLabel();
        }

        return $options;
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListStaff::route('/'),
            'edit' => Pages\EditStaff::route('/{record}/edit'),
        ];
    }
}
