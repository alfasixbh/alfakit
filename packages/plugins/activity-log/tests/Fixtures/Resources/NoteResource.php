<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitActivityLog\Tests\Fixtures\Resources;

use AlfaSix\Alfakit\Actions\CreateAction;
use AlfaSix\Alfakit\Actions\DeleteAction;
use AlfaSix\Alfakit\Actions\EditAction;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Resources\Pages\CreateRecord;
use AlfaSix\Alfakit\Resources\Pages\EditRecord;
use AlfaSix\Alfakit\Resources\Pages\ListRecords;
use AlfaSix\Alfakit\Resources\Resource;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Table;
use AlfaSix\AlfakitActivityLog\Concerns\LogsAlfakitActions;
use AlfaSix\AlfakitActivityLog\RelationManagers\ActivitiesRelationManager;
use AlfaSix\AlfakitActivityLog\Tests\Fixtures\Models\Note;

class NoteResource extends Resource
{
    protected static ?string $model = Note::class;

    protected static ?string $recordTitleAttribute = 'body';

    public static function form(Schema $schema): Schema
    {
        return $schema->components([TextInput::make('body')->required()]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([TextColumn::make('body')])
            ->headerActions([CreateAction::make()->form([TextInput::make('body')->required()])])
            ->recordActions([EditAction::make()->form([TextInput::make('body')->required()]), DeleteAction::make()]);
    }

    public static function getRelations(): array
    {
        return [ActivitiesRelationManager::class];
    }

    public static function getPages(): array
    {
        return [
            'index' => ListNotes::route('/'),
            'create' => CreateNote::route('/create'),
            'edit' => EditNote::route('/{record}/edit'),
        ];
    }
}

class ListNotes extends ListRecords
{
    protected static string $resource = NoteResource::class;
}

class CreateNote extends CreateRecord
{
    use LogsAlfakitActions;

    protected static string $resource = NoteResource::class;
}

class EditNote extends EditRecord
{
    use LogsAlfakitActions;

    protected static string $resource = NoteResource::class;
}
