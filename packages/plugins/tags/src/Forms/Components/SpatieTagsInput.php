<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitTags\Forms\Components;

use AlfaSix\Alfakit\Forms\Components\TagsInput;
use AlfaSix\AlfakitTags\Concerns\InteractsWithTagTypes;
use Illuminate\Database\Eloquent\Model;
use Spatie\Tags\Tag;

/**
 * A `TagsInput` for models using Spatie's `HasTags`. It is filled from the record's tags
 * (of `type()`), suggests the existing tags of that type and saves with
 * `syncTagsWithType()` (or `syncTags()` without a type) after the record is saved.
 *
 * ```php
 * SpatieTagsInput::make('tags')->type('categories')
 * ```
 */
class SpatieTagsInput extends TagsInput
{
    use InteractsWithTagTypes;

    protected function setUp(): void
    {
        parent::setUp();

        $this->suggestions(fn (): array => $this->getExistingTagNames());
    }

    public function getType(): string
    {
        return $this->type ?? 'TagsInput';
    }

    /**
     * The tag model of the form's model (`HasTags::getTagClassName()`), else the
     * configured `tags.tag_model`.
     *
     * @return class-string<Tag>
     */
    public function getTagClassName(): string
    {
        $record = $this->getRecord();
        $model = $record !== null ? $record::class : $this->getModel();
        $resolver = [$model, 'getTagClassName'];
        $class = $model !== null && is_callable($resolver) ? $resolver() : null;

        if (is_string($class) && is_a($class, Tag::class, true)) {
            return $class;
        }

        /** @var class-string<Tag> */
        return config('tags.tag_model', Tag::class);
    }

    /**
     * The names of the existing tags of the type, offered as suggestions.
     *
     * @return list<string>
     */
    public function getExistingTagNames(): array
    {
        $class = $this->getTagClassName();
        $query = $class::query();

        if (! $this->isAnyTagTypeAllowed()) {
            ($type = $this->getTagType()) === null ? $query->whereNull('type') : $query->where('type', $type);
        }

        return $query->orderBy('order_column')->get()
            ->map(static fn (Tag $tag): string => (string) $tag->getAttributeValue('name'))
            ->filter(static fn (string $name): bool => $name !== '')
            ->unique()
            ->values()
            ->all();
    }

    public function loadStateFromRelationships(): void
    {
        $record = $this->getRecord();

        if (! $record instanceof Model || ! $record->exists || ! method_exists($record, 'tags')) {
            return;
        }

        $this->state($this->getRecordTagNames($record));
    }

    /**
     * Saved through the tags relation in `saveRelationships()`.
     */
    public function isDehydrated(): bool
    {
        return false;
    }

    public function saveRelationships(): void
    {
        if (! $this->shouldSaveRelationships()) {
            return;
        }

        $record = $this->getRecord();

        if (! $record instanceof Model || ! $record->exists || ! method_exists($record, 'syncTagsWithType') || ! method_exists($record, 'syncTags')) {
            return;
        }

        $tags = $this->mutateDehydratedState($this->getState());
        $tags = is_array($tags) ? array_values(array_unique(array_map('strval', $tags))) : [];

        if ($this->isAnyTagTypeAllowed()) {
            $record->syncTags($tags);
        } else {
            $record->syncTagsWithType($tags, $this->getTagType());
        }

        $record->load('tags');
    }
}
