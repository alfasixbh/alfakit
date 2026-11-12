<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitCms\Support;

use AlfaSix\AlfakitCms\Enums\PageStatus;
use AlfaSix\AlfakitCms\Events\PagePublished;
use AlfaSix\AlfakitCms\Events\PageUnpublished;
use AlfaSix\AlfakitCms\Models\Page;
use AlfaSix\AlfakitCms\Rules\UniquePagePath;
use AlfaSix\AlfakitCms\Rules\ValidParent;
use DateTimeInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

/**
 * Publishing a page now or at a later time, and taking it back to a draft. Scheduled
 * pages need no job: a published page whose `publish_at` is in the future is hidden from
 * every public query until that time.
 */
final class Publisher
{
    public static function publish(Page $page, DateTimeInterface|string|null $at = null): Page
    {
        $at = $at === null || $at === '' ? null : Carbon::parse($at);

        // Saved changes go live with it (and become a revision).
        $hadChanges = $page->hasPendingChanges();
        self::validateDraft($page);
        $page->applyDraft();
        $page->review = null;

        $page->status = PageStatus::Published;
        $page->publish_at = $at !== null && $at->isFuture() ? $at : null;

        if ($page->publish_at === null && $page->published_at === null) {
            $page->published_at = now();
        }

        if ($page->publish_at !== null) {
            $page->published_at = $page->publish_at;
        }

        $page->withoutRevision = ! $hadChanges;
        $page->save();

        PagePublished::dispatch($page);

        return $page;
    }

    /**
     * The saved changes of a page are an autosave: nothing checked them. Before they go
     * live they must pass what the page form asks of them, or two pages could share a path,
     * a page could become its own parent, or one could lose its title.
     *
     * @throws ValidationException under `publish_at` (the field of the publish modal)
     */
    public static function validateDraft(Page $page): void
    {
        if (! $page->hasPendingChanges()) {
            return;
        }

        $draft = array_intersect_key((array) $page->draft, array_flip(Page::REVISIONED));
        $value = static fn (string $key): mixed => array_key_exists($key, $draft) ? $draft[$key] : $page->getAttribute($key);
        $tenant = $page->tenant_id === null ? null : $page->tenant;

        $validator = Validator::make(
            ['title' => $value('title'), 'slug' => $value('slug'), 'parent_id' => $value('parent_id')],
            [
                'title' => ['required', 'string'],
                'slug' => [
                    (bool) $value('is_home') ? 'nullable' : 'required',
                    new UniquePagePath($page, $value('parent_id'), $page->locale, (bool) $value('is_home'), $tenant),
                ],
                'parent_id' => [new ValidParent($page, $tenant)],
            ],
            [],
            ['title' => __('alfakit-cms::cms.fields.title'), 'slug' => __('alfakit-cms::cms.fields.slug'), 'parent_id' => __('alfakit-cms::cms.fields.parent')],
        );

        if ($validator->fails()) {
            throw ValidationException::withMessages(['publish_at' => $validator->errors()->all()]);
        }
    }

    /**
     * Throw away the saved changes of a page (the live version stays).
     */
    public static function discardChanges(Page $page): Page
    {
        $page->draft = null;
        $page->draft_saved_at = null;
        $page->withoutRevision = true;
        $page->save();

        return $page;
    }

    public static function unpublish(Page $page): Page
    {
        $page->status = PageStatus::Draft;
        $page->publish_at = null;
        $page->withoutRevision = true;
        $page->save();

        PageUnpublished::dispatch($page);

        return $page;
    }
}
