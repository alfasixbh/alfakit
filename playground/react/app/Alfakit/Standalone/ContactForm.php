<?php

declare(strict_types=1);

namespace App\Alfakit\Standalone;

use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Forms\Components\Textarea;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Schemas\Components\Utilities\Get;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Standalone\Form;

/**
 * A public contact form rendered on /contact, outside the admin panel.
 */
class ContactForm extends Form
{
    public function form(Schema $schema): Schema
    {
        return $schema->components([
            TextInput::make('name')->label(__('playground.contact.name'))->required()->maxLength(120),
            TextInput::make('email')->label(__('playground.contact.email'))->email()->required(),
            Select::make('topic')
                ->label(__('playground.contact.topic'))
                ->options(['sales' => __('playground.contact.topics.sales'), 'support' => __('playground.contact.topics.support'), 'other' => __('playground.contact.topics.other')])
                ->required()
                ->native(false)
                ->live(),
            TextInput::make('order_number')
                ->label(__('playground.contact.order_number'))
                ->visible(fn (Get $get): bool => $get('topic') === 'support')
                ->required(),
            Textarea::make('message')->label(__('playground.contact.message'))->required()->minLength(10)->rows(5)->columnSpanFull(),
        ])->columns(2);
    }

    public function submit(array $data): mixed
    {
        logger()->info('Contact form submitted', $data);

        Notification::make()->success()->title(__('playground.contact.thanks', ['name' => $data['name']]))->body(__('playground.contact.reply', ['email' => $data['email']]))->send();

        return back();
    }
}
