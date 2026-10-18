<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitTags\Tables\Columns;

use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\AlfakitTags\Concerns\InteractsWithTagTypes;
use Illuminate\Database\Eloquent\Model;

/**
 * The record's tags (of `type()`) as badges. The `tags` relation is eager loaded.
 *
 * ```php
 * SpatieTagsColumn::make('tags')->type('categories')
 * ```
 */
class SpatieTagsColumn extends TextColumn
{
    use InteractsWithTagTypes;

    protected function setUp(): void
    {
        parent::setUp();

        $this->badge();
    }

    public function getState(): mixed
    {
        if ($this->getStateUsing !== null) {
            return parent::getState();
        }

        $record = $this->getRecord();
        $names = $this->getRecordTagNames($record instanceof Model ? $record : null);

        return $names === [] ? ($this->evaluate($this->defaultState) ?? []) : $names;
    }

    public function getRelationshipsToEagerLoad(): array
    {
        return array_values(array_unique([...parent::getRelationshipsToEagerLoad(), 'tags']));
    }
}
