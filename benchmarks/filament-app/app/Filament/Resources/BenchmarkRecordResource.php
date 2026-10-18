<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Filament\Resources\BenchmarkRecordResource\Pages;
use App\Models\Benchmark\BenchmarkRecord;
use BackedEnum;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Columns\ToggleColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use UnitEnum;

/**
 * Benchmark scenario: the Filament v5 counterpart of
 * playground/react/app/Alfakit/Resources/Benchmark/BenchmarkRecordResource.php. Keep in sync.
 */
class BenchmarkRecordResource extends Resource
{
    protected static ?string $model = BenchmarkRecord::class;

    protected static string|BackedEnum|null $navigationIcon = 'heroicon-o-chart-bar';

    protected static string|UnitEnum|null $navigationGroup = 'Benchmark';

    protected static ?string $recordTitleAttribute = 'name';

    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            TextInput::make('sku')->required()->maxLength(16),
            TextInput::make('name')->required()->maxLength(255),
            Select::make('vendor_id')->relationship('vendor', 'name')->required(),
            Select::make('region_id')->relationship('region', 'name')->required(),
            Select::make('status')->options(['draft' => 'Draft', 'active' => 'Active', 'backorder' => 'Backorder', 'discontinued' => 'Discontinued'])->required(),
            Toggle::make('is_active'),
            TextInput::make('quantity')->numeric()->required(),
            TextInput::make('unit_price')->numeric()->required(),
            TextInput::make('weight')->numeric(),
            TextInput::make('rating')->numeric()->minValue(0)->maxValue(5)->step(0.1),
            DateTimePicker::make('shipped_at'),
        ])->columns(2);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('sku')->searchable()->sortable(),
                TextColumn::make('name')->searchable()->sortable(),
                TextColumn::make('vendor.name')->label('Vendor')->sortable(),
                TextColumn::make('region.name')->label('Region')->sortable(),
                TextColumn::make('status')->badge()->sortable()->color(fn (string $state): string => match ($state) {
                    'active' => 'success',
                    'backorder' => 'warning',
                    'discontinued' => 'danger',
                    default => 'gray',
                }),
                ToggleColumn::make('is_active')->label('Active'),
                TextColumn::make('quantity')->numeric()->sortable()->alignEnd(),
                TextColumn::make('unit_price')->money('USD')->sortable()->alignEnd(),
                TextColumn::make('weight')->numeric(decimalPlaces: 2)->sortable()->alignEnd(),
                TextColumn::make('rating')->numeric(decimalPlaces: 1)->sortable()->alignEnd(),
                TextColumn::make('shipped_at')->dateTime()->sortable(),
                TextColumn::make('created_at')->dateTime()->sortable(),
            ])
            ->filters([
                SelectFilter::make('status')->options(['draft' => 'Draft', 'active' => 'Active', 'backorder' => 'Backorder', 'discontinued' => 'Discontinued']),
            ])
            ->recordActions([
                EditAction::make(),
                DeleteAction::make(),
            ])
            ->toolbarActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('id', 'asc')
            ->paginationPageOptions([10, 25, 50, 100, 500])
            // Benchmark only: `?perPage=100` on the first GET (AlfaKit reads `perPage` from the
            // query string natively; Filament keeps it in the Livewire component).
            ->defaultPaginationPageOption(fn (): int => in_array((int) request()->query('perPage'), [10, 25, 50, 100, 500], true) ? (int) request()->query('perPage') : 25);
    }

    /**
     * The global search scenario (scripts/bench) searches these.
     *
     * @return array<int, string>
     */
    public static function getGloballySearchableAttributes(): array
    {
        return ['sku', 'name'];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListBenchmarkRecords::route('/'),
            'create' => Pages\CreateBenchmarkRecord::route('/create'),
            'edit' => Pages\EditBenchmarkRecord::route('/{record}/edit'),
        ];
    }
}
