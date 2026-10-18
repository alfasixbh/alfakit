<?php

namespace App\Examples;

use AlfaSix\Alfakit\Forms\Components\Repeater;
use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Standalone\Form;

class RepeaterItems extends Form
{
    public function form(Schema $schema): Schema
    {
        return $schema->components([
            Repeater::make('members')
                ->schema([
                    TextInput::make('name')->required(),
                    Select::make('role')
                        ->options(['owner' => 'Owner', 'editor' => 'Editor', 'viewer' => 'Viewer'])
                        ->required(),
                ])
                ->columns(2)
                ->defaultItems(2)
                ->maxItems(5),
        ]);
    }
}
