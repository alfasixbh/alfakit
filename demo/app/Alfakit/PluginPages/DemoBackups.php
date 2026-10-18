<?php

declare(strict_types=1);

namespace App\Alfakit\PluginPages;

use AlfaSix\Alfakit\Tables\Table;
use AlfaSix\AlfakitBackup\Pages\Backups;

/**
 * alfasix/alfakit-backup in read-only mode for the public demo: the destination cards and the
 * backups table stay, creating, downloading and deleting backups are removed. (The demo
 * database is rebuilt every hour by `demo:reset`, so it has nothing worth backing up.)
 */
class DemoBackups extends Backups
{
    public function getSubheading(): ?string
    {
        return __('plugins.backups.read_only');
    }

    protected function getHeaderActions(): array
    {
        return [];
    }

    public function table(Table $table): Table
    {
        return parent::table($table)->recordActions([]);
    }
}
