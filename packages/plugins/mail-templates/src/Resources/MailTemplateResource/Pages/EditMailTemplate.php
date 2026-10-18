<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitMailTemplates\Resources\MailTemplateResource\Pages;

use AlfaSix\Alfakit\Actions\DeleteAction;
use AlfaSix\Alfakit\Resources\Pages\EditRecord;
use AlfaSix\AlfakitMailTemplates\Resources\MailTemplateResource;

/**
 * Edit a template; Preview and "Send test" use the saved version. History (record
 * versions) is added by AlfaKit when `alfakit_record_versions` exists.
 */
class EditMailTemplate extends EditRecord
{
    protected static string $resource = MailTemplateResource::class;

    public static function getResource(): string
    {
        return MailTemplateResource::getPlugin()->getResource();
    }

    protected function getHeaderActions(): array
    {
        return [
            MailTemplateResource::previewAction(),
            MailTemplateResource::sendTestAction(),
            MailTemplateResource::resetAction(),
            DeleteAction::make(),
        ];
    }
}
