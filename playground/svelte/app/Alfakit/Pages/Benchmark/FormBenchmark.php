<?php

declare(strict_types=1);

namespace App\Alfakit\Pages\Benchmark;

use AlfaSix\Alfakit\Forms\Components\Checkbox;
use AlfaSix\Alfakit\Forms\Components\DatePicker;
use AlfaSix\Alfakit\Forms\Components\Repeater;
use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Forms\Components\Textarea;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Forms\Components\Toggle;
use AlfaSix\Alfakit\Pages\Page;
use AlfaSix\Alfakit\Schemas\Components\Component;
use AlfaSix\Alfakit\Schemas\Components\Section;
use AlfaSix\Alfakit\Schemas\Components\Utilities\Set;
use AlfaSix\Alfakit\Schemas\Schema;

/**
 * Benchmark scenario (scripts/bench): a form with 100 fields in five sections (text, number,
 * select, toggle, checkbox, date and textarea fields; `field_1` is `live()` and writes
 * `field_2`) and a Repeater of 10 items with four fields each. Mirrors
 * benchmarks/filament-app/app/Filament/Pages/FormBenchmark.php; keep the two in sync.
 */
class FormBenchmark extends Page
{
    protected static ?string $navigationIcon = 'gauge';

    protected static ?string $slug = 'form-benchmark';

    public static function getNavigationGroup(): string
    {
        return __('playground.nav.groups.benchmark');
    }

    public static function getNavigationLabel(): string
    {
        return __('playground.nav.form_benchmark');
    }

    public function getTitle(): string
    {
        return __('playground.nav.form_benchmark');
    }

    public function mount(mixed ...$parameters): void
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

        $this->formData = $data;
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
        ]);
    }

    /**
     * Field `$i`: 40 text inputs, 15 number inputs, 15 selects, 10 toggles, 5 checkboxes,
     * 10 date pickers and 5 textareas.
     */
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

    protected function flushCaches(): void
    {
        parent::flushCaches();

        $this->formData = null;
    }
}
