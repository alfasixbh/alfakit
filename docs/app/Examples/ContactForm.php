<?php

namespace App\Examples;

use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Forms\Components\Textarea;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Standalone\Form;

class ContactForm extends Form
{
    protected bool $shouldResetAfterSubmit = true;

    public function form(Schema $schema): Schema
    {
        return $schema->components([
            TextInput::make('email')->email()->required(),
            Select::make('topic')
                ->options(['question' => 'A question', 'bug' => 'A bug', 'idea' => 'An idea'])
                ->required(),
            Textarea::make('message')->required()->minLength(10)->columnSpanFull(),
        ])->columns(2);
    }

    public function submit(array $data): mixed
    {
        // A real form would send an email or store the message here.
        Notification::make()
            ->success()
            ->title('Thanks! We will reply to '.$data['email'].'.')
            ->send();

        return back();
    }
}
