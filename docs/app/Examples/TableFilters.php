<?php

namespace App\Examples;

use AlfaSix\Alfakit\Standalone\Table as StandaloneTable;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Filters\SelectFilter;
use AlfaSix\Alfakit\Tables\Filters\TernaryFilter;
use AlfaSix\Alfakit\Tables\Table;

class TableFilters extends StandaloneTable
{
    public function table(Table $table): Table
    {
        return $table
            ->records(fn (): array => Fixtures::orders())
            ->columns([
                TextColumn::make('number'),
                TextColumn::make('customer'),
                TextColumn::make('status')->badge(),
                TextColumn::make('total')->money('USD'),
            ])
            ->filters([
                SelectFilter::make('status')->options([
                    'pending' => 'Pending',
                    'paid' => 'Paid',
                    'refunded' => 'Refunded',
                ]),
                TernaryFilter::make('gift')->label('Gift wrapped'),
            ])
            ->paginationPageOptions([5]);
    }
}
