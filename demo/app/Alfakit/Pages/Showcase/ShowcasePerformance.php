<?php

declare(strict_types=1);

namespace App\Alfakit\Pages\Showcase;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Forms\Components\Repeater;
use AlfaSix\Alfakit\Forms\Components\Repeater\TableColumn;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Forms\Components\Toggle;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Schemas\Components\Grid;
use AlfaSix\Alfakit\Schemas\Components\Section;
use AlfaSix\Alfakit\Schemas\Components\Text;
use AlfaSix\Alfakit\Schemas\Components\UnorderedList;
use AlfaSix\Alfakit\Schemas\Components\Utilities\Set;
use AlfaSix\Alfakit\Schemas\Components\View;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Table;
use App\Demo\Catalog;
use App\Demo\DemoPanel;

/**
 * Showcase: a 10,000-row table and a 500-item repeater, with a readout of what the browser
 * actually transferred. Rows are generated on the fly (`records()`), so no seeding is needed.
 */
class ShowcasePerformance extends ShowcasePage
{
    protected static string $key = 'performance';

    protected static ?string $navigationIcon = 'gauge';

    protected static ?int $navigationSort = 6;

    public const ROWS = 10_000;

    public const ITEMS = 500;

    public function mount(mixed ...$parameters): void
    {
        $items = [];

        for ($i = 1; $i <= self::ITEMS; $i++) {
            $items[] = [
                'sku' => sprintf('MA-%s-%03d', ['AMB', 'FIG', 'OUD', 'ROS', 'VET'][$i % 5], $i),
                'quantity' => $i % 6 + 1,
                'unit_price' => round(45 + ($i % 37) * 4.5, 2),
                'gift' => $i % 9 === 0,
            ];
        }

        $this->formData = [
            'reference' => 'PO-2026-0117',
            'reference_upper' => 'PO-2026-0117',
            'lines' => $items,
        ];
    }

    protected function getHeaderActions(): array
    {
        return [
            Action::make('docs')
                ->label(self::t('actions.docs'))
                ->icon('book-open')
                ->button()
                ->outlined()
                ->url(DemoPanel::docsUrl('getting-started/performance'), shouldOpenInNewTab: true),
        ];
    }

    public function content(Schema $schema): Schema
    {
        return $schema->components([
            Grid::make(['default' => 1, '@lg' => 3])->schema([
                View::make('demo-perf-readout')
                    ->props([
                        'rows' => self::ROWS,
                        'items' => self::ITEMS,
                        'docsUrl' => DemoPanel::docsUrl('getting-started/performance'),
                    ])
                    ->columnSpan(['@lg' => 2]),
                Section::make(self::t('sections.how'))
                    ->compact()
                    ->icon('lightbulb')
                    ->schema([
                        UnorderedList::make([
                            self::t('lists.json'),
                            self::t('lists.partial'),
                            self::t('lists.virtualised'),
                            self::t('lists.live'),
                        ])->size('sm'),
                        Text::make(self::t('texts.debug_hint'))->size('sm')->color('gray'),
                    ]),
            ]),
        ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->heading(self::t('sections.table', ['rows' => number_format(self::ROWS)]))
            ->description(self::t('sections.table_help'))
            ->records(fn (): array => self::rows())
            ->columns([
                TextColumn::make('id')->label('#')->sortable()->alignEnd()->width('5rem'),
                TextColumn::make('number')->label(self::t('columns.order'))->searchable()->sortable()->fontFamily('mono'),
                TextColumn::make('customer')->label(self::t('columns.customer'))->searchable()->sortable(),
                TextColumn::make('city')->label(self::t('columns.city'))->sortable(),
                TextColumn::make('carrier')->label(self::t('columns.carrier'))->badge()->color('gray'),
                TextColumn::make('items')->label(self::t('columns.items'))->numeric()->alignEnd(),
                TextColumn::make('total')->label(self::t('columns.total'))->money('USD')->sortable()->alignEnd(),
            ])
            ->defaultSort('id')
            ->paginationPageOptions([100, 250, 1000])
            ->defaultPaginationPageOption(250)
            ->striped();
    }

    public function form(Schema $schema): Schema
    {
        return $schema->components([
            Section::make(self::t('sections.repeater', ['items' => self::ITEMS]))
                ->description(self::t('sections.repeater_help'))
                ->icon('rows-3')
                ->collapsible()
                ->schema([
                    Grid::make(['default' => 1, '@md' => 2])->schema([
                        TextInput::make('reference')
                            ->label(self::t('fields.reference'))
                            ->live()
                            ->afterStateUpdated(fn (Set $set, ?string $state) => $set('reference_upper', strtoupper((string) $state)))
                            ->helperText(self::t('fields.reference_help')),
                        TextInput::make('reference_upper')->label(self::t('fields.reference_upper'))->readOnly(),
                    ]),
                    Repeater::make('lines')
                        ->label(self::t('fields.lines'))
                        ->table([
                            TableColumn::make(self::t('fields.sku')),
                            TableColumn::make(self::t('fields.quantity')),
                            TableColumn::make(self::t('fields.unit_price')),
                            TableColumn::make(self::t('fields.gift')),
                        ])
                        ->schema([
                            TextInput::make('sku')->required(),
                            TextInput::make('quantity')->numeric()->integer()->minValue(1)->required(),
                            TextInput::make('unit_price')->numeric()->minValue(0)->required(),
                            Toggle::make('gift'),
                        ])
                        ->reorderable()
                        ->virtualizeThreshold(50),
                ]),
        ]);
    }

    protected function getFormActions(): array
    {
        return [
            Action::make('validate')
                ->label(self::t('actions.validate'))
                ->icon('circle-check')
                ->button()
                ->form(fn (): array => $this->getForm()?->getComponents(withHidden: true) ?? [])
                ->action(fn (array $data) => Notification::make()
                    ->title(self::t('notifications.validated', ['count' => count($data['lines'] ?? [])]))
                    ->success()
                    ->send()),
        ];
    }

    /**
     * Deterministic rows, so sorting and paging are stable between requests.
     *
     * @return array<int, array<string, mixed>>
     */
    private static function rows(): array
    {
        $rows = [];
        $firstNames = ['Emma', 'Noor', 'James', 'Hana', 'Olivia', 'Omar', 'Lucas', 'Sara', 'Daniel', 'Mariam', 'Chloe', 'Ethan'];
        $lastNames = ['Clarke', 'Haddad', 'Walker', 'Rahimi', 'Mansour', 'Brooks', 'Farah', 'Hughes', 'Bennett', 'Dubois', 'Keller', 'Moreau'];
        $cities = array_merge(...array_values(array_map(fn (array $places): array => array_column($places, 'city'), Catalog::CITIES)));
        $carriers = array_column(Catalog::CARRIERS, 'carrier');

        for ($i = 1; $i <= self::ROWS; $i++) {
            $items = $i % 4 + 1;

            $rows[] = [
                'id' => $i,
                'number' => sprintf('MA-2026-%06d', $i),
                'customer' => $firstNames[$i % count($firstNames)].' '.$lastNames[($i * 7) % count($lastNames)],
                'city' => $cities[($i * 3) % count($cities)],
                'carrier' => $carriers[$i % count($carriers)],
                'items' => $items,
                'total' => round($items * (68 + ($i % 23) * 7.5), 2),
            ];
        }

        return $rows;
    }
}
