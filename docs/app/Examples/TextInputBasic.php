<?php

namespace App\Examples;

use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Standalone\Form;

class TextInputBasic extends Form
{
    public function form(Schema $schema): Schema
    {
        return $schema->components([
            TextInput::make('name')
                ->placeholder('Ada Lovelace')
                ->required()
                ->maxLength(60),
            TextInput::make('email')
                ->email()
                ->prefixIcon('mail')
                ->helperText('We never share it.'),
            TextInput::make('website')
                ->prefix('https://')
                ->suffix('.com'),
            TextInput::make('password')
                ->password()
                ->revealable(),
        ])->columns(2);
    }
}
