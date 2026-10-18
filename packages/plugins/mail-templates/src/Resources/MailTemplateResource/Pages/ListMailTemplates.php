<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitMailTemplates\Resources\MailTemplateResource\Pages;

use AlfaSix\Alfakit\Actions\CreateAction;
use AlfaSix\Alfakit\Resources\Pages\ListRecords;
use AlfaSix\AlfakitMailTemplates\Resources\MailTemplateResource;

class ListMailTemplates extends ListRecords
{
    protected static string $resource = MailTemplateResource::class;

    public static function getResource(): string
    {
        return MailTemplateResource::getPlugin()->getResource();
    }

    protected function getHeaderActions(): array
    {
        return [CreateAction::make()->icon('plus')];
    }
}
