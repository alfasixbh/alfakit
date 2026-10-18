<?php

namespace App\Examples;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Forms\Components\Textarea;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Standalone\Table as StandaloneTable;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Table;

class TableRowActions extends StandaloneTable
{
    public function table(Table $table): Table
    {
        return $table
            ->records(fn (): array => Fixtures::orders())
            ->columns([
                TextColumn::make('number'),
                TextColumn::make('customer'),
                TextColumn::make('status')->badge(),
            ])
            ->recordActions([
                Action::make('note')
                    ->icon('message-square')
                    ->form([Textarea::make('note')->required()])
                    ->action(fn (array $data, $record) => Notification::make()
                        ->success()
                        ->title('Note added to '.data_get($record, 'number'))
                        ->body($data['note'])
                        ->send()),
                Action::make('refund')
                    ->icon('undo-2')
                    ->color('danger')
                    ->requiresConfirmation()
                    ->visible(fn ($record): bool => data_get($record, 'status') === 'paid')
                    ->action(fn ($record) => Notification::make()
                        ->success()
                        ->title(data_get($record, 'number').' would be refunded')
                        ->send()),
            ])
            ->paginationPageOptions([5]);
    }
}
