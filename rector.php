<?php

declare(strict_types=1);

use Rector\Config\RectorConfig;
use Rector\Php83\Rector\ClassMethod\AddOverrideAttributeToOverriddenMethodsRector;

return RectorConfig::configure()
    ->withPaths([
        __DIR__.'/packages/alfakit/src',
        __DIR__.'/packages/alfakit/config',
        __DIR__.'/packages/alfakit/database',
        __DIR__.'/packages/alfakit/tests',
    ])
    ->withPhpSets(php83: true)
    ->withPreparedSets(
        deadCode: true,
        codeQuality: true,
        typeDeclarations: true,
        earlyReturn: true,
    )
    ->withSkip([
        AddOverrideAttributeToOverriddenMethodsRector::class,
        __DIR__.'/packages/alfakit/tests/Fixtures/FilamentApp',
    ])
    ->withImportNames(removeUnusedImports: true);
