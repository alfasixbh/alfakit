<?php

declare(strict_types=1);

namespace App\Alfakit\Pages\Benchmark;

use AlfaSix\Alfakit\Forms\Components\Repeater;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Forms\Components\Toggle;
use AlfaSix\Alfakit\Pages\Page;
use AlfaSix\Alfakit\Schemas\Components\Section;
use AlfaSix\Alfakit\Schemas\Components\Utilities\Set;
use AlfaSix\Alfakit\Schemas\Schema;

/**
 * Benchmark scenario: a form with a live() field and a Repeater of N items
 * (`?items=100`, `?items=500`). Mirrors benchmarks/filament-app/app/Filament/Pages/RepeaterBenchmark.php.
 */
class RepeaterBenchmark extends Page
{
    protected static ?string $navigationIcon = 'gauge';

    protected static ?string $slug = 'repeater-benchmark';

    public static function getNavigationGroup(): string
    {
        return __('playground.nav.groups.benchmark');
    }

    public static function getNavigationLabel(): string
    {
        return __('playground.nav.repeater_benchmark');
    }

    public function mount(mixed ...$parameters): void
    {
        $count = min(1000, max(1, (int) request()->query('items', 100)));

        $this->formData = [
            'title' => 'Order #1',
            'summary' => '',
            'items' => array_map(static fn (int $i): array => [
                'name' => "Line item {$i}",
                'quantity' => $i % 7 + 1,
                'price' => round(($i % 50) * 3.25 + 1, 2),
                'taxable' => $i % 3 !== 0,
            ], range(1, $count)),
        ];
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
        ]);
    }

    protected function flushCaches(): void
    {
        parent::flushCaches();

        $this->formData = null;
    }
}
