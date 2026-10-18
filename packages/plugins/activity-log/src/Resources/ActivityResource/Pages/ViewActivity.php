<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitActivityLog\Resources\ActivityResource\Pages;

use AlfaSix\Alfakit\Resources\Pages\ViewRecord;
use AlfaSix\AlfakitActivityLog\Resources\ActivityResource;

class ViewActivity extends ViewRecord
{
    protected static string $resource = ActivityResource::class;

    /**
     * The resource registered by the plugin (a subclass given to `resourceClass()`).
     */
    public static function getResource(): string
    {
        return ActivityResource::getPlugin()->getResourceClass();
    }
}
