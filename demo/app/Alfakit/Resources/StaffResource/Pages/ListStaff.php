<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\StaffResource\Pages;

use AlfaSix\Alfakit\Resources\Pages\ListRecords;
use AlfaSix\Alfakit\Schemas\Components\Tabs\Tab;
use App\Alfakit\Resources\StaffResource;
use App\Enums\StaffRole;
use Illuminate\Database\Eloquent\Builder;

/**
 * The team, with a tab per role and the invitation action in the header (there is no
 * create page: colleagues join by invitation).
 */
class ListStaff extends ListRecords
{
    protected static string $resource = StaffResource::class;

    protected function getHeaderActions(): array
    {
        return [
            StaffResource::inviteAction(),
        ];
    }

    public function getTabs(): array
    {
        $tenant = alfakit()->getTenant();
        $tabs = ['all' => Tab::make(__('platform.staff.tabs.all'))];

        foreach (StaffRole::cases() as $role) {
            $key = match ($role) {
                StaffRole::Owner => 'owners',
                StaffRole::Manager => 'managers',
                StaffRole::Staff => 'staff',
            };

            $tabs[$key] = Tab::make(__('platform.staff.tabs.'.$key))
                ->icon($role->getIcon())
                ->modifyQueryUsing(fn (Builder $query) => $query->whereHas(
                    'stores',
                    fn (Builder $stores) => $stores->whereKey($tenant?->getKey())->where('store_user.role', $role->value),
                ));
        }

        return $tabs;
    }
}
