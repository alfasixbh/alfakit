<?php

namespace App\Examples;

use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Schemas\Components\Grid;
use AlfaSix\Alfakit\Schemas\Components\Section;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Standalone\Form;

class LayoutSectionGrid extends Form
{
    public function form(Schema $schema): Schema
    {
        return $schema->components([
            Section::make('Shipping address')
                ->description('Where we send the order.')
                ->icon('truck')
                ->schema([
                    TextInput::make('street')->columnSpanFull(),
                    Grid::make(3)->schema([
                        TextInput::make('city'),
                        TextInput::make('postcode'),
                        TextInput::make('country'),
                    ])->columnSpanFull(),
                ])
                ->columns(2),
            Section::make('Notes')->collapsible()->collapsed()->schema([
                TextInput::make('note'),
            ]),
        ]);
    }
}
