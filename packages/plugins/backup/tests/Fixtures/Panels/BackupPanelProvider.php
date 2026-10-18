<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitBackup\Tests\Fixtures\Panels;

use AlfaSix\Alfakit\Panel;
use AlfaSix\Alfakit\PanelProvider;
use AlfaSix\AlfakitBackup\BackupPlugin;

class BackupPanelProvider extends PanelProvider
{
    public function panel(Panel $panel): Panel
    {
        return $panel
            ->id('backups')
            ->path('backups-panel')
            ->login()
            ->middleware(['web'])
            ->plugin(BackupPlugin::make()->navigationGroup('System')->usingQueue('backups')->timeout(600));
    }
}
