<?php

declare(strict_types=1);

namespace App\Alfakit\Pages\Showcase;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Actions\BulkAction;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Schemas\Components\Callout;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Support\TenantScope;
use AlfaSix\Alfakit\Tables\Columns\ColorColumn;
use AlfaSix\Alfakit\Tables\Columns\ColumnGroup;
use AlfaSix\Alfakit\Tables\Columns\IconColumn;
use AlfaSix\Alfakit\Tables\Columns\ImageColumn;
use AlfaSix\Alfakit\Tables\Columns\Layout\Panel;
use AlfaSix\Alfakit\Tables\Columns\Layout\Split;
use AlfaSix\Alfakit\Tables\Columns\Layout\Stack;
use AlfaSix\Alfakit\Tables\Columns\SelectColumn;
use AlfaSix\Alfakit\Tables\Columns\Summarizers\Average;
use AlfaSix\Alfakit\Tables\Columns\Summarizers\Count;
use AlfaSix\Alfakit\Tables\Columns\Summarizers\Range;
use AlfaSix\Alfakit\Tables\Columns\Summarizers\Sum;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Columns\TextInputColumn;
use AlfaSix\Alfakit\Tables\Columns\ToggleColumn;
use AlfaSix\Alfakit\Tables\Columns\ViewColumn;
use AlfaSix\Alfakit\Tables\Enums\FiltersLayout;
use AlfaSix\Alfakit\Tables\Enums\PaginationMode;
use AlfaSix\Alfakit\Tables\Filters\SelectFilter;
use AlfaSix\Alfakit\Tables\Filters\TernaryFilter;
use AlfaSix\Alfakit\Tables\Grouping\Group;
use AlfaSix\Alfakit\Tables\Table;
use App\Demo\Catalog;
use App\Enums\Concentration;
use App\Enums\ProductStatus;
use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * Showcase: the table engine over the store's catalogue. Four modes, switched by the header
 * buttons (`?mode=`): the full-featured grid, infinite scroll, card layouts and a table over
 * plain arrays (`records()`).
 */
class ShowcaseTables extends ShowcasePage
{
    public const MODES = ['grid', 'infinite', 'cards', 'records'];

    protected static string $key = 'tables';

    protected static ?string $navigationIcon = 'table';

    protected static ?int $navigationSort = 4;

    public static function mode(): string
    {
        $mode = (string) request()->query('mode', 'grid');

        return in_array($mode, self::MODES, true) ? $mode : 'grid';
    }

    public function getSubheading(): ?string
    {
        return self::t('modes.'.self::mode().'_intro');
    }

    protected function getHeaderActions(): array
    {
        $current = self::mode();

        return array_map(fn (string $mode): Action => Action::make('mode_'.$mode)
            ->label(self::t('modes.'.$mode))
            ->icon(match ($mode) {
                'grid' => 'table-2',
                'infinite' => 'arrow-down-to-line',
                'cards' => 'layout-grid',
                default => 'braces',
            })
            ->button()
            ->color($mode === $current ? 'primary' : 'gray')
            ->outlined($mode !== $current)
            ->url(static::getUrl(['mode' => $mode])), self::MODES);
    }

    public function table(Table $table): Table
    {
        return match (self::mode()) {
            'infinite' => $this->infiniteTable($table),
            'cards' => $this->cardsTable($table),
            'records' => $this->recordsTable($table),
            default => $this->gridTable($table),
        };
    }

    private function query(): Builder
    {
        return TenantScope::apply(Product::query()->with(['brand', 'category'])->withCount('reviews'));
    }

    private function gridTable(Table $table): Table
    {
        return $table
            ->query($this->query())
            ->columns([
                ImageColumn::make('images')
                    ->label(self::t('columns.image'))
                    ->disk('demo')
                    ->limit(1)
                    ->square()
                    ->size(44),
                TextColumn::make('name')
                    ->label(self::t('columns.name'))
                    ->description(fn (Product $record): string => $record->sku)
                    ->searchable()
                    ->sortable()
                    ->weight('medium')
                    ->summarize(Count::make()->label(self::t('summaries.products'))),
                TextColumn::make('brand.name')
                    ->label(self::t('columns.brand'))
                    ->sortable()
                    ->toggleable(),
                TextColumn::make('concentration')
                    ->label(self::t('columns.concentration'))
                    ->badge()
                    ->formatStateUsing(fn (Concentration $state): string => $state->getLabel())
                    ->color(fn (Concentration $state): string => $state->getColor())
                    ->icon(fn (Concentration $state): string => $state->getIcon())
                    ->sortable(),
                ColorColumn::make('accent')
                    ->label(self::t('columns.accent'))
                    ->getStateUsing(fn (Product $record): string => self::accent($record->concentration))
                    ->toggleable(isToggledHiddenByDefault: true),
                ColumnGroup::make(self::t('columns.commerce'), [
                    TextColumn::make('price')
                        ->label(self::t('columns.price'))
                        ->money('USD')
                        ->sortable()
                        ->alignEnd()
                        ->summarize([Average::make()->money('USD')->label(self::t('summaries.average')), Range::make()->money('USD')->label(self::t('summaries.range'))]),
                    TextInputColumn::make('stock')
                        ->label(self::t('columns.stock'))
                        ->type('number')
                        ->rules(['required', 'integer', 'min:0', 'max:9999'])
                        ->sortable()
                        ->alignEnd()
                        ->summarize(Sum::make()->label(self::t('summaries.units'))),
                    ViewColumn::make('stock_level')
                        ->label(self::t('columns.level'))
                        ->view('demo-stock-meter')
                        ->viewData(fn (Product $record): array => ['stock' => $record->stock, 'max' => 120, 'low' => 15])
                        ->toggleable(),
                ]),
                SelectColumn::make('status')
                    ->label(self::t('columns.status'))
                    ->options(ProductStatus::options())
                    ->sortable(),
                ToggleColumn::make('featured')
                    ->label(self::t('columns.featured'))
                    ->onIcon('star')
                    ->offIcon('star-off')
                    ->sortable(),
                IconColumn::make('reviews_count')
                    ->label(self::t('columns.reviewed'))
                    ->boolean()
                    ->getStateUsing(fn (Product $record): bool => $record->reviews_count > 0)
                    ->trueIcon('message-square-heart')
                    ->falseIcon('message-square-dashed')
                    ->toggleable(),
                TextColumn::make('published_at')
                    ->label(self::t('columns.published'))
                    ->since()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->groups([
                Group::make('concentration')->label(self::t('columns.concentration'))->getTitleFromRecordUsing(fn (Product $record): string => $record->concentration->getLabel())->collapsible(),
                Group::make('brand.name')->label(self::t('columns.brand')),
                Group::make('category.name')->label(self::t('columns.category')),
            ])
            ->filters([
                SelectFilter::make('brand')->label(self::t('columns.brand'))->relationship('brand', 'name')->searchable()->preload()->multiple(),
                SelectFilter::make('concentration')->label(self::t('columns.concentration'))->options(Concentration::options())->multiple(),
                SelectFilter::make('status')->label(self::t('columns.status'))->options(ProductStatus::options()),
                TernaryFilter::make('featured')->label(self::t('columns.featured')),
            ], layout: FiltersLayout::Modal)
            ->deferFilters()
            ->persistFiltersInSession()
            ->reorderableColumns()
            ->striped()
            ->recordActions([
                Action::make('restock')
                    ->label(self::t('actions.restock'))
                    ->icon('package-plus')
                    ->requiresConfirmation()
                    ->action(function (Product $record): void {
                        $record->increment('stock', 24);
                        Notification::make()->title(self::t('notifications.restocked', ['name' => $record->name]))->success()->send();
                    }),
            ])
            ->bulkActions([
                BulkAction::make('feature')
                    ->label(self::t('actions.feature'))
                    ->icon('star')
                    ->action(fn (Collection $records) => $records->each->update(['featured' => true]))
                    ->deselectRecordsAfterCompletion(),
                BulkAction::make('unfeature')
                    ->label(self::t('actions.unfeature'))
                    ->icon('star-off')
                    ->color('gray')
                    ->action(fn (Collection $records) => $records->each->update(['featured' => false]))
                    ->deselectRecordsAfterCompletion(),
            ])
            ->defaultSort('name')
            ->paginationPageOptions([10, 25, 50, 100])
            ->defaultPaginationPageOption(25)
            ->searchPlaceholder(self::t('search'));
    }

    private function infiniteTable(Table $table): Table
    {
        return $table
            ->query($this->query())
            ->columns([
                ImageColumn::make('images')->label(self::t('columns.image'))->disk('demo')->limit(1)->circular()->size(36),
                TextColumn::make('name')->label(self::t('columns.name'))->searchable()->sortable()->weight('medium'),
                TextColumn::make('brand.name')->label(self::t('columns.brand'))->visibleFrom('md'),
                TextColumn::make('concentration')->label(self::t('columns.concentration'))->badge()->formatStateUsing(fn (Concentration $state): string => $state->getLabel())->color(fn (Concentration $state): string => $state->getColor()),
                TextColumn::make('price')->label(self::t('columns.price'))->money('USD')->alignEnd()->sortable(),
                TextColumn::make('stock')->label(self::t('columns.stock'))->numeric()->alignEnd()->visibleFrom('lg'),
            ])
            ->paginationMode(PaginationMode::InfiniteScroll)
            ->defaultPaginationPageOption(25)
            ->paginationPageOptions([25, 50])
            ->deferLoading()
            ->defaultSort('name')
            ->searchPlaceholder(self::t('search'));
    }

    private function cardsTable(Table $table): Table
    {
        return $table
            ->query($this->query())
            ->columns([
                Split::make([
                    ImageColumn::make('images')->label(self::t('columns.image'))->disk('demo')->limit(1)->square()->size(72)->grow(false),
                    Stack::make([
                        TextColumn::make('name')->label(self::t('columns.name'))->weight('semibold')->searchable()->sortable(),
                        TextColumn::make('brand.name')->label(self::t('columns.brand'))->icon('tag')->color('gray'),
                        TextColumn::make('price')->label(self::t('columns.price'))->money('USD')->weight('medium'),
                    ])->space(1),
                    TextColumn::make('concentration')->label(self::t('columns.concentration'))->badge()->formatStateUsing(fn (Concentration $state): string => $state->getLabel())->color(fn (Concentration $state): string => $state->getColor())->grow(false),
                ])->from('sm'),
                Panel::make([
                    TextColumn::make('scent_notes')
                        ->label(self::t('columns.notes'))
                        ->getStateUsing(fn (Product $record): array => array_values(array_filter([
                            implode(', ', $record->scent_notes['top'] ?? []),
                            implode(', ', $record->scent_notes['heart'] ?? []),
                            implode(', ', $record->scent_notes['base'] ?? []),
                        ])))
                        ->listWithLineBreaks()
                        ->bulleted(),
                    TextColumn::make('stock')->label(self::t('columns.stock'))->numeric()->prefix(self::t('columns.stock').': '),
                ])->collapsible(),
            ])
            ->contentGrid(['md' => 2, 'xl' => 3])
            ->paginationMode(PaginationMode::LoadMore)
            ->defaultPaginationPageOption(9)
            ->paginationPageOptions([9, 18])
            ->defaultSort('featured', 'desc')
            ->searchPlaceholder(self::t('search'));
    }

    /**
     * A table over plain arrays: how often each scent note appears in the store's catalogue.
     */
    private function recordsTable(Table $table): Table
    {
        return $table
            ->records(function (): array {
                $products = TenantScope::apply(Product::query())->get(['id', 'scent_notes', 'price']);
                $rows = [];

                foreach (['top', 'heart', 'base'] as $family) {
                    foreach (Catalog::NOTES[$family] as $note) {
                        $matching = $products->filter(fn (Product $product): bool => in_array($note, $product->scent_notes[$family] ?? [], true));

                        $rows[] = [
                            'id' => $family.':'.$note,
                            'note' => $note,
                            'family' => $family,
                            'products' => $matching->count(),
                            'share' => $products->isEmpty() ? 0 : round($matching->count() / $products->count() * 100, 1),
                            'average_price' => $matching->isEmpty() ? null : round((float) $matching->avg('price'), 2),
                        ];
                    }
                }

                return $rows;
            })
            ->columns([
                TextColumn::make('note')->label(self::t('columns.note'))->searchable()->sortable()->weight('medium'),
                TextColumn::make('family')
                    ->label(self::t('columns.family'))
                    ->badge()
                    ->formatStateUsing(fn (string $state): string => self::t('families.'.$state))
                    ->color(fn (string $state): string => match ($state) {
                        'top' => 'info',
                        'heart' => 'warning',
                        default => 'primary',
                    })
                    ->sortable(),
                TextColumn::make('products')->label(self::t('columns.products'))->numeric()->sortable()->alignEnd()->summarize(Sum::make()),
                TextColumn::make('share')->label(self::t('columns.share'))->suffix(' %')->sortable()->alignEnd(),
                TextColumn::make('average_price')->label(self::t('columns.average_price'))->money('USD')->sortable()->alignEnd()->placeholder('—'),
            ])
            ->defaultSort('products', 'desc')
            ->paginationPageOptions([15, 45])
            ->defaultPaginationPageOption(15)
            ->searchPlaceholder(self::t('search_notes'));
    }

    public function content(Schema $schema): Schema
    {
        return $schema->components([
            Callout::make(self::t('callouts.heading'))
                ->description(self::t('callouts.'.self::mode()))
                ->info()
                ->icon('table-properties'),
        ]);
    }

    private static function accent(Concentration $concentration): string
    {
        return match ($concentration) {
            Concentration::Extrait, Concentration::Parfum => '#073B78',
            Concentration::EauDeParfum, Concentration::EauDeToilette => '#3B82F6',
            Concentration::Candle, Concentration::Diffuser => '#F47A22',
            default => '#9CA3AF',
        };
    }
}
