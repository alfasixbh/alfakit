<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitTags\Infolists\Components;

use AlfaSix\Alfakit\Infolists\Components\TextEntry;
use AlfaSix\AlfakitTags\Concerns\InteractsWithTagTypes;

/**
 * The record's tags (of `type()`) as badges.
 *
 * ```php
 * SpatieTagsEntry::make('tags')->type('categories')
 * ```
 */
class SpatieTagsEntry extends TextEntry
{
    use InteractsWithTagTypes;

    protected function setUp(): void
    {
        parent::setUp();

        $this->badge();
    }

    public function getType(): string
    {
        return $this->type ?? 'TextEntry';
    }

    public function getState(): mixed
    {
        if ($this->getStateUsing !== null) {
            return parent::getState();
        }

        $names = $this->getRecordTagNames($this->getRecord());

        return $names === [] ? ($this->evaluate($this->defaultState) ?? []) : $names;
    }
}
