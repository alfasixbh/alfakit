<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\ExpenseResource\Pages;

use AlfaSix\Alfakit\Resources\Pages\CreateRecord;
use App\Alfakit\Resources\ExpenseResource;

class CreateExpense extends CreateRecord
{
    protected static string $resource = ExpenseResource::class;

    /**
     * The requester is the signed-in user, set on the server.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    protected function mutateFormDataBeforeCreate(array $data): array
    {
        $data['user_id'] = auth()->id();

        return $data;
    }
}
