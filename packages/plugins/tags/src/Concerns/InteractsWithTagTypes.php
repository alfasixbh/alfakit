<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitTags\Concerns;

use Closure;
use Illuminate\Database\Eloquent\Model;
use Spatie\Tags\Tag;

/**
 * The tag type shared by the input, the column and the entry. Without `type()` tags of
 * every type are used; `type(null)` means tags without a type.
 */
trait InteractsWithTagTypes
{
    protected string|Closure|null $tagType = null;

    protected bool $hasTagType = false;

    /**
     * Only use tags of this type (`categories`), or tags without a type (`null`).
     */
    public function type(string|Closure|null $type): static
    {
        $this->tagType = $type;
        $this->hasTagType = true;

        return $this;
    }

    /**
     * Use tags of every type again (the default).
     */
    public function anyTagType(): static
    {
        $this->tagType = null;
        $this->hasTagType = false;

        return $this;
    }

    public function getTagType(): ?string
    {
        $type = $this->evaluate($this->tagType);

        return is_string($type) && $type !== '' ? $type : null;
    }

    public function isAnyTagTypeAllowed(): bool
    {
        return ! $this->hasTagType;
    }

    /**
     * The record's tags of the type, in their order.
     *
     * @return list<Tag>
     */
    public function getRecordTags(?Model $record): array
    {
        if ($record === null || ! method_exists($record, 'tags')) {
            return [];
        }

        $type = $this->getTagType();
        $any = $this->isAnyTagTypeAllowed();

        return collect($record->getRelationValue('tags') ?? [])
            ->filter(static fn (mixed $tag): bool => $tag instanceof Tag && ($any || $tag->getAttribute('type') === $type))
            ->sortBy(static fn (Tag $tag): int => (int) $tag->getAttribute('order_column'))
            ->values()
            ->all();
    }

    /**
     * The names of the record's tags of the type, in the app's locale.
     *
     * @return list<string>
     */
    public function getRecordTagNames(?Model $record): array
    {
        return array_values(array_map(static fn (Tag $tag): string => (string) $tag->getAttributeValue('name'), $this->getRecordTags($record)));
    }
}
