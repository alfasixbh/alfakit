<?php

declare(strict_types=1);

it('autoloads the first-party plugin namespaces', function (string $namespace): void {
    $loader = require dirname(__DIR__, 2).'/vendor/autoload.php';

    expect($loader->getPrefixesPsr4())->toHaveKey($namespace);
})->with([
    'AlfaSix\\AlfakitShield\\', 'AlfaSix\\AlfakitBilling\\', 'AlfaSix\\AlfakitMediaLibrary\\', 'AlfaSix\\AlfakitSettings\\',
    'AlfaSix\\AlfakitTags\\', 'AlfaSix\\AlfakitActivityLog\\', 'AlfaSix\\AlfakitBackup\\', 'AlfaSix\\AlfakitHealth\\',
    'AlfaSix\\AlfakitCalendar\\', 'AlfaSix\\AlfakitTree\\', 'AlfaSix\\AlfakitComments\\',
    'AlfaSix\\AlfakitKanban\\', 'AlfaSix\\AlfakitForms\\', 'AlfaSix\\AlfakitCms\\', 'AlfaSix\\AlfakitApi\\',
    'AlfaSix\\AlfakitOps\\', 'AlfaSix\\AlfakitWebhooks\\', 'AlfaSix\\AlfakitTranslationManager\\', 'AlfaSix\\AlfakitFeatureFlags\\', 'AlfaSix\\AlfakitAi\\', 'AlfaSix\\AlfakitTeams\\', 'AlfaSix\\AlfakitHelpdesk\\', 'AlfaSix\\AlfakitFileManager\\', 'AlfaSix\\AlfakitWorkflows\\', 'AlfaSix\\AlfakitInvoices\\', 'AlfaSix\\AlfakitAnalytics\\', 'AlfaSix\\AlfakitMailTemplates\\',
]);
