<?php

declare(strict_types=1);

namespace App\Alfakit\Resources;

use AlfaSix\Alfakit\Actions\DeleteAction;
use AlfaSix\Alfakit\Actions\DeleteBulkAction;
use AlfaSix\Alfakit\Actions\EditAction;
use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Forms\Components\Textarea;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Forms\Components\Toggle;
use AlfaSix\Alfakit\Resources\Resource;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Tables\Columns\IconColumn;
use AlfaSix\Alfakit\Tables\Columns\SelectColumn;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Filters\SelectFilter;
use AlfaSix\Alfakit\Tables\Filters\TernaryFilter;
use AlfaSix\Alfakit\Tables\Table;
use App\Alfakit\Resources\FeedbackResource\Pages;
use App\Models\Feedback;

class FeedbackResource extends Resource
{
    protected static ?string $model = Feedback::class;

    protected static ?string $navigationIcon = 'message-square';

    protected static ?string $recordTitleAttribute = 'page';

    protected static ?string $pluralModelLabel = 'feedback';

    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            TextInput::make('page')->required()->readOnly(),
            Toggle::make('is_helpful')->label('Helpful'),
            Select::make('status')->options(['new' => 'New', 'reviewed' => 'Reviewed', 'done' => 'Done'])->required(),
            TextInput::make('email')->email(),
            Textarea::make('message')->rows(5)->columnSpanFull(),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('page')->searchable()->sortable()->url(fn (Feedback $record) => url('/docs/'.$record->page), shouldOpenInNewTab: true),
                IconColumn::make('is_helpful')->label('Helpful')->boolean(),
                TextColumn::make('message')->limit(80)->wrap()->searchable()->placeholder('—'),
                SelectColumn::make('status')->options(['new' => 'New', 'reviewed' => 'Reviewed', 'done' => 'Done']),
                TextColumn::make('created_at')->since()->sortable(),
            ])
            ->filters([
                SelectFilter::make('status')->options(['new' => 'New', 'reviewed' => 'Reviewed', 'done' => 'Done']),
                TernaryFilter::make('is_helpful')->label('Helpful'),
            ])
            ->recordActions([EditAction::make(), DeleteAction::make()])
            ->bulkActions([DeleteBulkAction::make()])
            ->defaultSort('created_at', 'desc');
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListFeedback::route('/'),
            'create' => Pages\CreateFeedback::route('/create'),
            'edit' => Pages\EditFeedback::route('/{record}/edit'),
        ];
    }

    public static function getNavigationBadge(): string|int|null
    {
        return Feedback::query()->where('status', 'new')->count() ?: null;
    }

    public static function getNavigationBadgeColor(): ?string
    {
        return 'warning';
    }
}
