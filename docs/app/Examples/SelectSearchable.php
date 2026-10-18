<?php

namespace App\Examples;

use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Standalone\Form;

class SelectSearchable extends Form
{
    public function form(Schema $schema): Schema
    {
        return $schema->components([
            Select::make('framework')
                ->options([
                    'react' => 'React',
                    'vue' => 'Vue',
                    'svelte' => 'Svelte',
                ])
                ->default('react')
                ->required(),
            Select::make('languages')
                ->multiple()
                ->searchable()
                ->options([
                    'en' => 'English',
                    'ar' => 'Arabic',
                    'fr' => 'French',
                    'de' => 'German',
                    'ja' => 'Japanese',
                    'tr' => 'Turkish',
                ]),
        ])->columns(2);
    }
}
