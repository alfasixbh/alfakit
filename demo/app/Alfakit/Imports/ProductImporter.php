<?php

declare(strict_types=1);

namespace App\Alfakit\Imports;

use AlfaSix\Alfakit\Actions\Imports\ImportColumn;
use AlfaSix\Alfakit\Actions\Imports\Importer;
use AlfaSix\Alfakit\Actions\Imports\Models\Import;
use App\Enums\Concentration;
use App\Enums\ProductStatus;
use App\Models\Product;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * CSV import for the catalog: rows are matched on SKU inside the current store (existing
 * products are updated), brands and categories are resolved by name.
 */
class ProductImporter extends Importer
{
    protected static ?string $model = Product::class;

    public static function getColumns(): array
    {
        return [
            ImportColumn::make('sku')
                ->label(fn (): string => __('catalog.fields.sku'))
                ->requiredMapping()
                ->rules(['required', 'string', 'max:40'])
                ->helperText(fn (): string => __('catalog.importer.sku_help'))
                ->example('MA-MAN-0420'),
            ImportColumn::make('name')
                ->label(fn (): string => __('catalog.fields.name'))
                ->requiredMapping()
                ->rules(['required', 'string', 'max:120'])
                ->example('Saffron Dune'),
            ImportColumn::make('brand')
                ->label(fn (): string => __('catalog.fields.brand'))
                ->relationship(resolveUsing: 'name')
                ->helperText(fn (): string => __('catalog.importer.brand_help'))
                ->example('Dune & Cedar'),
            ImportColumn::make('category')
                ->label(fn (): string => __('catalog.fields.category'))
                ->relationship(resolveUsing: 'name')
                ->example('Eau de parfum'),
            ImportColumn::make('concentration')
                ->label(fn (): string => __('catalog.fields.concentration'))
                ->rules(['nullable', Rule::enum(Concentration::class)])
                ->example('eau_de_parfum'),
            ImportColumn::make('size_ml')
                ->label(fn (): string => __('catalog.fields.size_ml'))
                ->integer()
                ->rules(['nullable', 'integer', 'min:1', 'max:5000'])
                ->example('50'),
            ImportColumn::make('price')
                ->label(fn (): string => __('catalog.fields.price'))
                ->requiredMapping()
                ->numeric(decimalPlaces: 2)
                ->rules(['required', 'numeric', 'min:0'])
                ->example('128.00'),
            ImportColumn::make('cost')
                ->label(fn (): string => __('catalog.fields.cost'))
                ->numeric(decimalPlaces: 2)
                ->rules(['nullable', 'numeric', 'min:0'])
                ->example('54.20'),
            ImportColumn::make('stock')
                ->label(fn (): string => __('catalog.fields.stock'))
                ->integer()
                ->rules(['nullable', 'integer', 'min:0'])
                ->example('24'),
            ImportColumn::make('status')
                ->label(fn (): string => __('catalog.fields.status'))
                ->rules(['nullable', Rule::enum(ProductStatus::class)])
                ->example('active'),
            ImportColumn::make('featured')
                ->label(fn (): string => __('catalog.fields.featured'))
                ->boolean()
                ->example('no'),
        ];
    }

    public function resolveRecord(): ?Model
    {
        /** @var Product $product */
        $product = $this->newQuery()->firstOrNew(['sku' => (string) ($this->data['sku'] ?? '')]);

        return $product;
    }

    /** Fill the columns the CSV does not carry so a new row is a complete, publishable product. */
    protected function beforeSave(): void
    {
        $record = $this->getRecord();

        if (! $record instanceof Product) {
            return;
        }

        $record->slug = $record->slug ?: Str::slug($record->name.'-'.Str::lower(Str::afterLast($record->sku, '-')));
        $record->concentration ??= Concentration::EauDeParfum;
        $record->status ??= ProductStatus::Draft;
        $record->audience = $record->audience ?: 'unisex';
        $record->stock ??= 0;
        $record->name_translations = array_replace($record->name_translations ?? [], [Product::DEFAULT_LOCALE => $record->name]);
    }

    public static function getCompletedNotificationBody(Import $import): string
    {
        $body = trans_choice('catalog.importer.completed', $import->successful_rows, ['count' => number_format($import->successful_rows)]);
        $failed = $import->getFailedRowsCount();

        return $failed > 0 ? $body.' '.trans_choice('catalog.importer.failed_rows', $failed, ['count' => number_format($failed)]) : $body;
    }
}
