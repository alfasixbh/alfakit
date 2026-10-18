<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\Benchmark;

use AlfaSix\Alfakit\Actions\DeleteAction;
use AlfaSix\Alfakit\Actions\DeleteBulkAction;
use AlfaSix\Alfakit\Actions\EditAction;
use AlfaSix\Alfakit\Forms\Components\DateTimePicker;
use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Forms\Components\Toggle;
use AlfaSix\Alfakit\Resources\Resource;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Columns\ToggleColumn;
use AlfaSix\Alfakit\Tables\Filters\SelectFilter;
use AlfaSix\Alfakit\Tables\Table;
use App\Alfakit\Resources\Benchmark\BenchmarkRecordResource\Pages;
use App\Models\Benchmark\BenchmarkRecord;

/**
 * Benchmark scenario: 10,000 rows, 12 columns (2 relationships, a badge, a toggle).
 * Mirrors benchmarks/filament-app/app/Filament/Resources/BenchmarkRecordResource.php;
 * keep the two in sync. See /benchmarks/README.md.
 */
class BenchmarkRecordResource extends Resource
{
    protected static ?string $model = BenchmarkRecord::class;

    protected static ?string $navigationIcon = 'gauge';

    protected static ?string $recordTitleAttribute = 'name';

    public static function getNavigationGroup(): string
    {
        return __('playground.nav.groups.benchmark');
    }

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
            ->bulkActions([
                DeleteBulkAction::make(),
            ])
            ->defaultSort('id', 'asc')
            ->paginationPageOptions([10, 25, 50, 100, 500])
            ->defaultPaginationPageOption(25);
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
