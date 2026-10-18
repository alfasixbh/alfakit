<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitBackup\Support;

/**
 * What a backup created from the panel contains.
 */
enum BackupOption: string
{
    case All = 'all';
    case OnlyDb = 'only-db';
    case OnlyFiles = 'only-files';

    public function getLabel(): string
    {
        return (string) __('alfakit-backup::backup.actions.create.options.'.match ($this) {
            self::All => 'all',
            self::OnlyDb => 'only_db',
            self::OnlyFiles => 'only_files',
        });
    }

    /**
     * @return array<string, string>
     */
    public static function options(): array
    {
        $options = [];

        foreach (self::cases() as $case) {
            $options[$case->value] = $case->getLabel();
        }

        return $options;
    }
}
