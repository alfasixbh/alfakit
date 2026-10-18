<?php

declare(strict_types=1);

namespace App\Filament\Pages;

use BackedEnum;
use Filament\Forms\Components\Checkbox;
use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\Repeater;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Pages\Page;
use Filament\Schemas\Components\Component;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Utilities\Set;
use Filament\Schemas\Schema;
use UnitEnum;

/**
 * Benchmark scenario: the Filament v5 counterpart of
 * playground/react/app/Alfakit/Pages/Benchmark/FormBenchmark.php (100 fields + a 10-item repeater).
 */
class FormBenchmark extends Page
{
    protected static string|BackedEnum|null $navigationIcon = 'heroicon-o-chart-bar';

    protected static string|UnitEnum|null $navigationGroup = 'Benchmark';

    protected static ?string $title = 'Form benchmark';

    protected static ?string $slug = 'form-benchmark';

    protected string $view = 'filament.pages.repeater-benchmark';

    /** @var array<string, mixed>|null */
    public ?array $data = [];

    public function mount(): void
    {
        $data = ['lines' => array_map(static fn (int $i): array => ['name' => "Line {$i}", 'quantity' => $i, 'price' => $i * 2.5, 'taxable' => $i % 2 === 0], range(1, 10))];

        foreach (range(1, 100) as $i) {
            $data["field_{$i}"] = match (self::kind($i)) {
                'toggle', 'checkbox' => $i % 2 === 0,
                'number' => $i,
                'select' => 'option_'.($i % 5),
                'date' => '2026-01-'.str_pad((string) ($i % 28 + 1), 2, '0', STR_PAD_LEFT),
                default => "Value {$i}",
            };
        }

        $this->form->fill($data);
    }

    public function form(Schema $schema): Schema
    {
        $sections = [];

        foreach (array_chunk(range(1, 100), 20) as $index => $numbers) {
            $sections[] = Section::make('Section '.($index + 1))
                ->schema(array_map(self::field(...), $numbers))
                ->columns(4);
        }

        return $schema->components([
            ...$sections,
            Repeater::make('lines')->schema([
                TextInput::make('name')->required(),
                TextInput::make('quantity')->numeric()->required(),
                TextInput::make('price')->numeric()->required(),
                Toggle::make('taxable'),
            ])->columns(4),
        ])->statePath('data');
    }

    private static function kind(int $i): string
    {
        return match (true) {
            $i <= 40 => 'text',
            $i <= 55 => 'number',
            $i <= 70 => 'select',
            $i <= 80 => 'toggle',
            $i <= 85 => 'checkbox',
            $i <= 95 => 'date',
            default => 'textarea',
        };
    }

    private static function field(int $i): Component
    {
        $name = "field_{$i}";

        return match (self::kind($i)) {
            'number' => TextInput::make($name)->numeric(),
            'select' => Select::make($name)->options(array_combine(array_map(static fn (int $o): string => "option_{$o}", range(0, 4)), array_map(static fn (int $o): string => "Option {$o}", range(0, 4)))),
            'toggle' => Toggle::make($name),
            'checkbox' => Checkbox::make($name),
            'date' => DatePicker::make($name),
            'textarea' => Textarea::make($name)->rows(2),
            default => $i === 1
                ? TextInput::make($name)->live()->afterStateUpdated(fn (Set $set, ?string $state) => $set('field_2', strtoupper((string) $state)))
                : TextInput::make($name),
        };
    }
}
