<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitTags;

use AlfaSix\Alfakit\Contracts\Plugin;
use AlfaSix\Alfakit\Panel;

/**
 * Registering the plugin is optional: the input, column and entry work in any panel
 * (and standalone). Register it to declare the dependency on the panel and to retrieve
 * it with `TagsPlugin::get()`.
 *
 * ```php
 * $panel->plugin(TagsPlugin::make());
 * ```
 */
class TagsPlugin implements Plugin
{
    public const ID = 'tags';

    public static function make(): static
    {
        return new static;
    }

    /**
     * The plugin registered on the current panel.
     */
    public static function get(): static
    {
        /** @var static */
        return alfakit()->getCurrentOrDefaultPanel()->getPlugin(self::ID);
    }

    public function getId(): string
    {
        return self::ID;
    }

    public function register(Panel $panel): void {}

    public function boot(Panel $panel): void {}
}
