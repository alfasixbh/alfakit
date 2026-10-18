<?php

namespace App\Examples;

use AlfaSix\Alfakit\Forms\Components\Textarea;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Forms\Components\Toggle;
use AlfaSix\Alfakit\Schemas\Components\Tabs;
use AlfaSix\Alfakit\Schemas\Components\Tabs\Tab;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Standalone\Form;

class LayoutTabs extends Form
{
    public function form(Schema $schema): Schema
    {
        return $schema->components([
            Tabs::make('Product')->tabs([
                Tab::make('Details')->icon('package')->schema([
                    TextInput::make('name')->required(),
                    Textarea::make('description'),
                ]),
                Tab::make('Pricing')->icon('tag')->schema([
                    TextInput::make('price')->numeric()->prefix('$'),
                    Toggle::make('on_sale'),
                ]),
                Tab::make('SEO')->icon('search')->schema([
                    TextInput::make('meta_title')->maxLength(60),
                ]),
            ]),
        ]);
    }
}
