<?php

namespace App\Examples;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Standalone\Component;

class ActionModalForm extends Component
{
    public function actions(): array
    {
        return [
            Action::make('invite')
                ->label('Invite a teammate')
                ->icon('user-plus')
                ->modalDescription('They get an email with a link to join.')
                ->form([
                    TextInput::make('email')->email()->required(),
                    Select::make('role')
                        ->options(['admin' => 'Admin', 'member' => 'Member'])
                        ->default('member')
                        ->required(),
                ])
                ->action(fn (array $data) => Notification::make()
                    ->success()
                    ->title('Invitation sent to '.$data['email'])
                    ->send()),
            Action::make('delete')
                ->label('Delete workspace')
                ->color('danger')
                ->requiresConfirmation()
                ->modalDescription('This cannot be undone.')
                ->action(fn () => Notification::make()->title('Nothing was deleted: this is the docs.')->send()),
        ];
    }
}
