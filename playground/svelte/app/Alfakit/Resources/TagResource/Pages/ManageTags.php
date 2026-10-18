<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\TagResource\Pages;

use App\Alfakit\Resources\TagResource;
use AlfaSix\Alfakit\Actions\CreateAction;
use AlfaSix\Alfakit\Resources\Pages\ListRecords;

/**
 * Create, edit and delete records in modals on a single page.
 */
class ManageTags extends ListRecords
{
    protected static string $resource = TagResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make()->form(fn () => static::getResource()::form(\AlfaSix\Alfakit\Schemas\Schema::make())->getComponents(withHidden: true)),
        ];
    }

    public function table(\AlfaSix\Alfakit\Tables\Table $table): \AlfaSix\Alfakit\Tables\Table
    {
        $table = parent::table($table);

        foreach ($table->getRecordActions() as $action) {
            if ($action instanceof \AlfaSix\Alfakit\Actions\EditAction || $action instanceof \AlfaSix\Alfakit\Actions\ViewAction) {
                $action->form(fn () => static::getResource()::form(\AlfaSix\Alfakit\Schemas\Schema::make())->getComponents(withHidden: true));
            }
        }

        return $table->recordUrl(null);
    }
}
