<?php

namespace App\Examples;

use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Schemas\Components\Utilities\Get;
use AlfaSix\Alfakit\Schemas\Components\Utilities\Set;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Standalone\Form;
use Illuminate\Support\Str;

class LiveFields extends Form
{
    public function form(Schema $schema): Schema
    {
        return $schema->components([
            TextInput::make('title')
                ->live(onBlur: true)
                ->afterStateUpdated(fn (Set $set, ?string $state) => $set('slug', Str::slug((string) $state))),
            TextInput::make('slug')->prefix('/blog/'),
            Select::make('type')
                ->options(['post' => 'Post', 'video' => 'Video'])
                ->default('post')
                ->live(),
            TextInput::make('video_url')
                ->url()
                ->visible(fn (Get $get): bool => $get('type') === 'video'),
        ])->columns(2);
    }
}
