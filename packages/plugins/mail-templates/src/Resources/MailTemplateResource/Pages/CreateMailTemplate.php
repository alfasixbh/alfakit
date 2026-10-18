<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitMailTemplates\Resources\MailTemplateResource\Pages;

use AlfaSix\Alfakit\Resources\Pages\CreateRecord;
use AlfaSix\AlfakitMailTemplates\Resources\MailTemplateResource;

class CreateMailTemplate extends CreateRecord
{
    protected static string $resource = MailTemplateResource::class;

    public static function getResource(): string
    {
        return MailTemplateResource::getPlugin()->getResource();
    }

    public static function canCreateAnother(): bool
    {
        return false;
    }

    protected function getRedirectUrl(): string
    {
        $record = $this->getCreatedRecord();
        $resource = static::getResource();

        return $record !== null && $resource::canEdit($record) ? $resource::getUrl('edit', ['record' => $record]) : $resource::getUrl();
    }
}
