<?php

declare(strict_types=1);

namespace App\Alfakit\Resources;

use AlfaSix\Alfakit\Actions\DeleteAction;
use AlfaSix\Alfakit\Actions\DeleteBulkAction;
use AlfaSix\Alfakit\Actions\EditAction;
use AlfaSix\Alfakit\Actions\ViewAction;
use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Forms\Components\Textarea;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Forms\Components\ToggleButtons;
use AlfaSix\Alfakit\Infolists\Components\TextEntry;
use AlfaSix\Alfakit\Resources\ApiResource;
use AlfaSix\Alfakit\Resources\Pages\Page;
use AlfaSix\Alfakit\Schemas\Components\Section;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Filters\SelectFilter;
use AlfaSix\Alfakit\Tables\Table;
use App\Alfakit\Resources\SupplierResource\Pages;
use App\Alfakit\Resources\SupplierResource\SupplierDataSource;
use App\Demo\Nav;
use App\Demo\SupplierApi;
use App\Models\User;
use Closure;
use Illuminate\Database\Eloquent\Model;

/**
 * Ingredient and packaging suppliers, read from and written to an external JSON API (the
 * demo serves a fake one at /demo-api/suppliers) through an `HttpDataSource`: no model,
 * no table. List, search, filters, create, edit, view, delete and global search all go
 * over HTTP; the API's own validation errors land on the form fields. Staff may browse
 * suppliers; changing them needs a manager.
 */
class SupplierResource extends ApiResource
{
    protected static ?string $dataSource = SupplierDataSource::class;

    protected static ?string $navigationIcon = 'truck';

    protected static ?int $navigationSort = 50;

    protected static ?string $recordTitleAttribute = 'name';

    public static function getModelLabel(): string
    {
        return __('suppliers.label');
    }

    public static function getPluralModelLabel(): string
    {
        return __('suppliers.plural');
    }

    public static function getNavigationLabel(): string
    {
        return __('suppliers.navigation');
    }

    public static function getNavigationGroup(): ?string
    {
        return Nav::group(Nav::CATALOG);
    }

    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            Section::make(self::t('sections.supplier'))
                ->columns(2)
                ->schema([
                    TextInput::make('name')
                        ->label(self::t('fields.name'))
                        ->required()
                        ->maxLength(80),
                    TextInput::make('email')
                        ->label(self::t('fields.email'))
                        ->email()
                        ->required()
                        ->maxLength(120),
                    TextInput::make('country')
                        ->label(self::t('fields.country'))
                        ->helperText(self::t('helper.country'))
                        ->required()
                        ->maxLength(2),
                    Select::make('category')
                        ->label(self::t('fields.category'))
                        ->options(fn (): array => self::categories())
                        ->required(),
                ]),
            Section::make(self::t('sections.terms'))
                ->columns(2)
                ->schema([
                    ToggleButtons::make('status')
                        ->label(self::t('fields.status'))
                        ->options(fn (): array => self::statuses())
                        ->colors(['active' => 'success', 'paused' => 'warning'])
                        ->default('active')
                        ->grouped(),
                    TextInput::make('lead_time_days')
                        ->label(self::t('fields.lead_time_days'))
                        ->integer()
                        ->minValue(1)
                        ->maxValue(365),
                    Select::make('rating')
                        ->label(self::t('fields.rating'))
                        ->options([1 => '1', 2 => '2', 3 => '3', 4 => '4', 5 => '5']),
                    Textarea::make('notes')
                        ->label(self::t('fields.notes'))
                        ->maxLength(500)
                        ->columnSpanFull(),
                ]),
        ]);
    }

    public static function infolist(Schema $schema): Schema
    {
        return $schema->components([
            Section::make(self::t('sections.supplier'))
                ->columns(2)
                ->schema([
                    TextEntry::make('name')->label(self::t('fields.name')),
                    TextEntry::make('email')->label(self::t('fields.email'))->copyable(),
                    TextEntry::make('country')->label(self::t('fields.country')),
                    TextEntry::make('category')
                        ->label(self::t('fields.category'))
                        ->badge()
                        ->formatStateUsing(fn (?string $state): ?string => self::categories()[$state] ?? $state),
                ]),
            Section::make(self::t('sections.terms'))
                ->columns(2)
                ->schema([
                    TextEntry::make('status')
                        ->label(self::t('fields.status'))
                        ->badge()
                        ->color(fn (?string $state): string => $state === 'active' ? 'success' : 'warning')
                        ->formatStateUsing(fn (?string $state): ?string => self::statuses()[$state] ?? $state),
                    TextEntry::make('lead_time_days')
                        ->label(self::t('fields.lead_time_days'))
                        ->formatStateUsing(fn (mixed $state): ?string => is_numeric($state) ? trans_choice('suppliers.lead_time', (int) $state) : null),
                    TextEntry::make('rating')->label(self::t('fields.rating')),
                    TextEntry::make('updated_at')->label(self::t('fields.updated_at'))->since(),
                    TextEntry::make('notes')->label(self::t('fields.notes'))->columnSpanFull(),
                ]),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('name')
                    ->label(self::t('fields.name'))
                    ->description(fn (Model $record): string => (string) $record['email'])
                    ->searchable()
                    ->sortable()
                    ->weight('medium'),
                TextColumn::make('category')
                    ->label(self::t('fields.category'))
                    ->badge()
                    ->formatStateUsing(fn (?string $state): ?string => self::categories()[$state] ?? $state)
                    ->sortable(),
                TextColumn::make('country')
                    ->label(self::t('fields.country'))
                    ->sortable(),
                TextColumn::make('lead_time_days')
                    ->label(self::t('fields.lead_time_days'))
                    ->formatStateUsing(fn (mixed $state): ?string => is_numeric($state) ? trans_choice('suppliers.lead_time', (int) $state) : null)
                    ->sortable()
                    ->alignEnd(),
                TextColumn::make('rating')
                    ->label(self::t('fields.rating'))
                    ->sortable()
                    ->alignEnd(),
                TextColumn::make('status')
                    ->label(self::t('fields.status'))
                    ->badge()
                    ->color(fn (?string $state): string => $state === 'active' ? 'success' : 'warning')
                    ->formatStateUsing(fn (?string $state): ?string => self::statuses()[$state] ?? $state),
                TextColumn::make('updated_at')
                    ->label(self::t('fields.updated_at'))
                    ->since()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                // The API filters: its `?category=` and `?status=` parameters receive the state.
                SelectFilter::make('category')
                    ->label(self::t('fields.category'))
                    ->options(fn (): array => self::categories()),
                SelectFilter::make('status')
                    ->label(self::t('fields.status'))
                    ->options(fn (): array => self::statuses()),
            ])
            ->recordActions([
                ViewAction::make(),
                EditAction::make(),
                DeleteAction::make(),
            ])
            ->bulkActions([
                DeleteBulkAction::make(),
            ])
            ->defaultSort('name')
            ->paginationPageOptions([10, 25, 50]);
    }

    public static function getRecordSubNavigation(Page $page): array
    {
        return $page->generateNavigationItems([Pages\ViewSupplier::class, Pages\EditSupplier::class]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListSuppliers::route('/'),
            'create' => Pages\CreateSupplier::route('/create'),
            'view' => Pages\ViewSupplier::route('/{record}'),
            'edit' => Pages\EditSupplier::route('/{record}/edit'),
        ];
    }

    // ---------------------------------------------------------------- Authorisation (no policy)

    public static function canCreate(): bool
    {
        return self::isManager();
    }

    public static function canEdit(Model $record): bool
    {
        return self::isManager();
    }

    public static function canDelete(Model $record): bool
    {
        return self::isManager();
    }

    public static function canDeleteAny(): bool
    {
        return self::isManager();
    }

    private static function isManager(): bool
    {
        $user = auth()->user();

        return $user instanceof User && $user->hasStaffRole('manager');
    }

    // ---------------------------------------------------------------- Labels

    private static function t(string $key): Closure
    {
        return static fn (): string => __("suppliers.{$key}");
    }

    /**
     * @return array<string, string>
     */
    private static function categories(): array
    {
        return collect(SupplierApi::CATEGORIES)->mapWithKeys(fn (string $category): array => [$category => __("suppliers.categories.{$category}")])->all();
    }

    /**
     * @return array<string, string>
     */
    private static function statuses(): array
    {
        return collect(SupplierApi::STATUSES)->mapWithKeys(fn (string $status): array => [$status => __("suppliers.statuses.{$status}")])->all();
    }
}
