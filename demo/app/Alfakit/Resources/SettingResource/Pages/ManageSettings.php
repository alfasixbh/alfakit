<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\SettingResource\Pages;

use AlfaSix\Alfakit\Resources\Pages\ManageSingularRecord;
use App\Alfakit\Resources\SettingResource;
use App\Models\Setting;
use App\Models\Store;
use Illuminate\Database\Eloquent\Model;

/**
 * The one settings record of the current store, created on the first save when the seeder
 * left none. The "Store" section of the form writes to the tenant through the `store`
 * relationship, so saving here also renames the store in the tenant menu.
 */
class ManageSettings extends ManageSingularRecord
{
    protected static string $resource = SettingResource::class;

    protected function resolveSingularRecord(): Model
    {
        $tenant = alfakit()->getTenant();

        $setting = SettingResource::getEloquentQuery()->first();

        if ($setting instanceof Setting) {
            return $setting;
        }

        return new Setting($tenant instanceof Store ? ['store_id' => $tenant->id] : []);
    }
}
