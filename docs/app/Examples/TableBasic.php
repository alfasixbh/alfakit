<?php

namespace App\Examples;

use AlfaSix\Alfakit\Standalone\Table as StandaloneTable;
use AlfaSix\Alfakit\Tables\Columns\IconColumn;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Table;

class TableBasic extends StandaloneTable
{
    public function table(Table $table): Table
    {
        return $table
            // Any array works; an Eloquent query (->query()) is the usual source.
            ->records(fn (): array => Fixtures::orders())
            ->columns([
                TextColumn::make('number')->searchable()->sortable(),
                TextColumn::make('customer')->searchable(),
                TextColumn::make('status')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'paid' => 'success',
                        'refunded' => 'danger',
                        default => 'warning',
                    }),
                TextColumn::make('total')->money('USD')->sortable(),
                IconColumn::make('gift')->boolean(),
            ])
            ->defaultSort('number', 'desc')
            ->paginationPageOptions([5, 10]);
    }
}
