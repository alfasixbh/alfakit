<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\TagResource\Pages;

use AlfaSix\Alfakit\Actions\CreateAction;
use AlfaSix\Alfakit\Actions\EditAction;
use AlfaSix\Alfakit\Actions\ViewAction;
use AlfaSix\Alfakit\Resources\Pages\ListRecords;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Tables\Table;
use App\Alfakit\Resources\TagResource;

/**
 * Create, edit and delete records in modals on a single page.
 */
class ManageTags extends ListRecords
{
    protected static string $resource = TagResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make()->form(fn () => static::getResource()::form(Schema::make())->getComponents(withHidden: true)),
        ];
    }

    public function table(Table $table): Table
    {
        $table = parent::table($table);

        foreach ($table->getRecordActions() as $action) {
            if ($action instanceof EditAction || $action instanceof ViewAction) {
                $action->form(fn () => static::getResource()::form(Schema::make())->getComponents(withHidden: true));
            }
        }

        return $table->recordUrl(null);
    }
}
