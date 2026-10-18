<?php

namespace App\Examples;

use AlfaSix\Alfakit\Infolists\Components\IconEntry;
use AlfaSix\Alfakit\Infolists\Components\TextEntry;
use AlfaSix\Alfakit\Schemas\Components\Section;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Standalone\Infolist;

class InfolistBasic extends Infolist
{
    public function infolist(Schema $schema): Schema
    {
        return $schema
            ->fill(Fixtures::orders()[0])
            ->components([
                Section::make('Order')->schema([
                    TextEntry::make('number')->copyable(),
                    TextEntry::make('status')->badge()->color('success'),
                    TextEntry::make('customer'),
                    TextEntry::make('total')->money('USD'),
                    IconEntry::make('gift')->boolean(),
                    TextEntry::make('placed_at')->date(),
                ])->columns(3),
            ]);
    }
}
