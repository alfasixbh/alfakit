<?php

namespace App\Examples;

use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Standalone\Form;

class ValidationRules extends Form
{
    public function form(Schema $schema): Schema
    {
        return $schema->components([
            TextInput::make('username')
                ->required()
                ->alphaDash()
                ->minLength(3)
                ->maxLength(20),
            TextInput::make('age')
                ->numeric()
                ->minValue(18)
                ->maxValue(120),
            TextInput::make('password')
                ->password()
                ->required()
                ->rule('min:8')
                ->confirmed(),
            TextInput::make('password_confirmation')
                ->password()
                ->required()
                ->dehydrated(false),
        ])->columns(2);
    }

    public function submit(array $data): mixed
    {
        Notification::make()->success()->title('Valid on the server.')->send();

        return back();
    }
}
