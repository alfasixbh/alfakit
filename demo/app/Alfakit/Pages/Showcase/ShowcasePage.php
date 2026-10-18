<?php

declare(strict_types=1);

namespace App\Alfakit\Pages\Showcase;

use AlfaSix\Alfakit\Pages\Page;
use App\Demo\Nav;

/**
 * A page of the Showcase group: a feature tour of what the shop screens don't cover.
 * Titles and intros come from lang/{en,ar}/showcase.php under the page's `$key`.
 */
abstract class ShowcasePage extends Page
{
    /** Translation key under `showcase.` and the URL slug suffix. */
    protected static string $key = '';

    public static function getNavigationGroup(): ?string
    {
        return Nav::group(Nav::SHOWCASE);
    }

    public static function getSlug(): string
    {
        return 'showcase-'.static::$key;
    }

    public static function getNavigationLabel(): string
    {
        return __('showcase.'.static::$key.'.title');
    }

    public function getTitle(): string
    {
        return __('showcase.'.static::$key.'.title');
    }

    public function getSubheading(): ?string
    {
        return __('showcase.'.static::$key.'.intro');
    }

    /** Translate a string of this page: `$this->t('sections.text')`. */
    protected static function t(string $key, array $replace = []): string
    {
        return __('showcase.'.static::$key.'.'.$key, $replace);
    }

    protected function flushCaches(): void
    {
        parent::flushCaches();

        $this->formData = null;
    }
}
