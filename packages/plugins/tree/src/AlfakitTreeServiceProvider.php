<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitTree;

use Illuminate\Support\ServiceProvider;

/**
 * Loads the plugin's translations under the `alfakit-tree::` namespace. The frontend
 * strings (`alfakit-tree::tree.ui`) reach the renderers through the panel's
 * `frontendTranslations()`, registered by `TreePlugin`.
 */
class AlfakitTreeServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadTranslationsFrom(dirname(__DIR__).'/resources/lang', 'alfakit-tree');
    }
}
