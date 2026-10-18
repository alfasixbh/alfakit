<?php

declare(strict_types=1);

/*
 * Shared Pest bootstrap for the first-party plugins in packages/plugins/*. Each plugin's
 * tests extend its own TestCase (packages/plugins/{plugin}/tests/TestCase.php), which
 * extends the AlfaKit package TestCase and registers the plugin's service provider.
 */
