<?php

namespace App\Alfakit\Imports;

use AlfaSix\Alfakit\Actions\Imports\ImportColumn;
use AlfaSix\Alfakit\Actions\Imports\Importer;
use App\Models\Category;
use Illuminate\Database\Eloquent\Model;

class CategoryImporter extends Importer
{
    protected static ?string $model = Category::class;

    public static function getColumns(): array
    {
        return [
            ImportColumn::make('name')
                ->label(fn (): string => __('playground.fields.name'))
                ->requiredMapping()
                ->rules(['required', 'max:255']),
            ImportColumn::make('slug')
                ->label(fn (): string => __('playground.fields.slug'))
                ->requiredMapping()
                ->rules(['required', 'max:255']),
            ImportColumn::make('color')
                ->label(fn (): string => __('playground.fields.color'))
                ->rules(['max:255']),
        ];
    }

    public function resolveRecord(): ?Model
    {
        // Update existing records instead of creating new ones, e.g.:
        // return $this->newQuery()->firstOrNew(['email' => $this->data['email']]);

        return new Category;
    }
}
