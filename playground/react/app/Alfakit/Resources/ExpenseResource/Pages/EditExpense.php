<?php

declare(strict_types=1);

namespace App\Alfakit\Resources\ExpenseResource\Pages;

use AlfaSix\Alfakit\Resources\Pages\EditRecord;
use App\Alfakit\Resources\ExpenseResource;

class EditExpense extends EditRecord
{
    protected static string $resource = ExpenseResource::class;
}
