<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitActivityLog\Concerns;

use AlfaSix\AlfakitActivityLog\Support\ActionActivityLogger;
use Illuminate\Database\Eloquent\Model;

/**
 * Logs an activity when a resource's create or edit page saves a record whose model
 * doesn't use `LogsActivity` itself:
 *
 * ```php
 * class EditInvoice extends EditRecord
 * {
 *     use LogsAlfakitActions;
 * }
 * ```
 *
 * The page hooks run after the built-in `afterCreate()` / `afterSave()` (trait hooks are
 * named after the trait). Delete, create and edit actions in tables are covered by
 * `ActivityLogPlugin::make()->logActions()`.
 */
trait LogsAlfakitActions
{
    protected function afterCreateLogsAlfakitActions(): void
    {
        $record = method_exists($this, 'getCreatedRecord') ? $this->getCreatedRecord() : null;

        if ($record instanceof Model) {
            ActionActivityLogger::log('created', $record);
        }
    }

    protected function afterSaveLogsAlfakitActions(): void
    {
        $record = method_exists($this, 'getRecord') ? $this->getRecord() : null;

        if ($record instanceof Model) {
            ActionActivityLogger::log('updated', $record);
        }
    }
}
