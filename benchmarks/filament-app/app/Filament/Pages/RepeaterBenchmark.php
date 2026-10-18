<?php

declare(strict_types=1);

namespace App\Filament\Pages;

use BackedEnum;
use Filament\Forms\Components\Repeater;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Pages\Page;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Utilities\Set;
use Filament\Schemas\Schema;
use UnitEnum;

/**
 * Benchmark scenario: the Filament v5 counterpart of
 * playground/react/app/Alfakit/Pages/Benchmark/RepeaterBenchmark.php (`?items=100`, `?items=500`).
 */
class RepeaterBenchmark extends Page
{
    protected static string|BackedEnum|null $navigationIcon = 'heroicon-o-chart-bar';

    protected static string|UnitEnum|null $navigationGroup = 'Benchmark';

    protected static ?string $title = 'Repeater benchmark';

    protected static ?string $slug = 'repeater-benchmark';

    protected string $view = 'filament.pages.repeater-benchmark';

    /** @var array<string, mixed>|null */
    public ?array $data = [];

    public function mount(): void
    {
        $count = min(1000, max(1, (int) request()->query('items', 100)));

        $this->form->fill([
            'title' => 'Order #1',
            'summary' => '',
            'items' => array_map(static fn (int $i): array => [
                'name' => "Line item {$i}",
                'quantity' => $i % 7 + 1,
                'price' => round(($i % 50) * 3.25 + 1, 2),
                'taxable' => $i % 3 !== 0,
            ], range(1, $count)),
        ]);
    }

    public function form(Schema $schema): Schema
    {
        return $schema->components([
            Section::make('Order')->schema([
                TextInput::make('title')
                    ->live()
                    ->afterStateUpdated(fn (Set $set, ?string $state) => $set('summary', strtoupper((string) $state))),
                TextInput::make('summary'),
            ])->columns(2),
            Repeater::make('items')->schema([
                TextInput::make('name')->required(),
                TextInput::make('quantity')->numeric()->required(),
                TextInput::make('price')->numeric()->required(),
                Toggle::make('taxable'),
            ])->columns(4),
        ])->statePath('data');
    }
}
