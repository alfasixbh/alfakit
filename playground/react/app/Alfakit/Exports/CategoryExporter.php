<?php

namespace App\Alfakit\Exports;

use AlfaSix\Alfakit\Actions\Exports\ExportColumn;
use AlfaSix\Alfakit\Actions\Exports\Exporter;
use App\Models\Category;

class CategoryExporter extends Exporter
{
    protected static ?string $model = Category::class;

    public static function getColumns(): array
    {
        return [
            ExportColumn::make('id')
                ->label(fn (): string => __('playground.fields.id')),
            ExportColumn::make('name')->label(fn (): string => __('playground.fields.name')),
            ExportColumn::make('slug')->label(fn (): string => __('playground.fields.slug')),
            ExportColumn::make('color')->label(fn (): string => __('playground.fields.color')),
            ExportColumn::make('created_at')->label(fn (): string => __('playground.fields.created_at')),
            ExportColumn::make('updated_at')->label(fn (): string => __('playground.fields.updated_at')),
        ];
    }
}
