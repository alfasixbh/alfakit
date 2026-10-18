<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitTree;

use AlfaSix\Alfakit\Contracts\Plugin;
use AlfaSix\Alfakit\Panel;

/**
 * Shares the tree's frontend strings with the panel. Tree pages and widgets work without
 * it, with English labels.
 *
 * ```php
 * $panel->plugin(TreePlugin::make());
 * ```
 */
class TreePlugin implements Plugin
{
    public const ID = 'tree';

    public static function make(): static
    {
        return new static;
    }

    public function getId(): string
    {
        return self::ID;
    }

    public function register(Panel $panel): void
    {
        $panel->frontendTranslations(['tree' => 'alfakit-tree::tree.ui']);
    }

    public function boot(Panel $panel): void {}
}
