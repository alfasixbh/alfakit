<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitActivityLog\Resources\ActivityResource\Pages;

use AlfaSix\Alfakit\Resources\Pages\ListRecords;
use AlfaSix\AlfakitActivityLog\Resources\ActivityResource;

class ListActivities extends ListRecords
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
