<?php

namespace App\Examples;

use AlfaSix\Alfakit\Forms\Components\Checkbox;
use AlfaSix\Alfakit\Forms\Components\DatePicker;
use AlfaSix\Alfakit\Forms\Components\TimePicker;
use AlfaSix\Alfakit\Forms\Components\Toggle;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Standalone\Form;

class DateAndToggle extends Form
{
    public function form(Schema $schema): Schema
    {
        return $schema->components([
            DatePicker::make('starts_on')->required(),
            TimePicker::make('starts_at')->seconds(false),
            Toggle::make('is_public')->label('Public event')->default(true),
            Checkbox::make('send_reminders')->helperText('One day before.'),
        ])->columns(2);
    }
}
