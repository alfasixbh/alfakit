<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitBackup\Http\Controllers;

use AlfaSix\AlfakitBackup\BackupPlugin;
use AlfaSix\AlfakitBackup\Support\BackupRepository;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Streams a backup to the browser. The route sits in the panel (signed-in users only),
 * needs a valid signature (links expire, see `BackupPlugin::downloadLinkLifetime()`) and
 * re-checks the plugin's authorisation; only listed backups can be downloaded.
 */
class DownloadBackupController
{
    public function __invoke(Request $request): StreamedResponse
    {
        abort_unless(BackupPlugin::get()->isAuthorized(), 403);

        $disk = $request->query('disk');
        $path = $request->query('path');

        abort_unless(is_string($disk) && is_string($path), 404);

        $backup = BackupRepository::find($disk, $path);

        abort_if($backup === null, 404);

        $stream = $backup->stream();

        return response()->streamDownload(static function () use ($stream): void {
            fpassthru($stream);

            if (is_resource($stream)) {
                fclose($stream);
            }
        }, basename($path), [
            'Content-Type' => 'application/zip',
            'Content-Length' => (string) (int) $backup->sizeInBytes(),
        ]);
    }
}
