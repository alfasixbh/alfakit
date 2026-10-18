<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\StaffResource\Pages;

use AlfaSix\Alfakit\Actions\ImpersonateAction;
use AlfaSix\Alfakit\Resources\Pages\EditRecord;
use App\Alfakit\Resources\StaffResource;
use App\Enums\StaffRole;
use App\Models\User;

/**
 * Edits the account and, through the pivot, the person's role in the current store. The
 * role is lifted out of the form data before saving and written to `store_user` afterwards.
 */
class EditStaff extends EditRecord
{
    protected static string $resource = StaffResource::class;

    private ?StaffRole $role = null;

    protected function getHeaderActions(): array
    {
        return [
            ImpersonateAction::make(),
            StaffResource::removeAction()->after(fn () => redirect()->to(StaffResource::getUrl())),
        ];
    }

    protected function mutateFormDataBeforeFill(array $data): array
    {
        $record = $this->getRecord();

        $data['role'] = $record instanceof User ? $record->roleIn()?->value : null;

        return $data;
    }

    protected function mutateFormDataBeforeSave(array $data): array
    {
        $this->role = isset($data['role']) ? StaffRole::from((string) $data['role']) : null;

        unset($data['role']);

        return $data;
    }

    protected function afterSave(): void
    {
        $record = $this->getRecord();

        if ($this->role !== null && $record instanceof User && StaffResource::canChangeRole($record)) {
            StaffResource::setRole($record, $this->role);
        }
    }

    protected function flushCaches(): void
    {
        parent::flushCaches();

        $this->role = null;
    }
}
