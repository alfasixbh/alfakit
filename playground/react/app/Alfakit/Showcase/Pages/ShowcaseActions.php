<?php

declare(strict_types=1);

namespace App\Alfakit\Showcase\Pages;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Forms\Components\Textarea;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Forms\Components\Toggle;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Pages\Page;
use AlfaSix\Alfakit\Schemas\Components\Html;
use AlfaSix\Alfakit\Schemas\Components\Wizard\Step;
use AlfaSix\Alfakit\Schemas\Schema;
use App\Alfakit\Showcase\Clusters\Showcase;
use RuntimeException;

/**
 * Showcase: action wizards, nested modal actions, rate limiting and password confirmation.
 * Every action only shows a notification.
 */
class ShowcaseActions extends Page
{
    protected static ?string $cluster = Showcase::class;

    protected static ?string $navigationIcon = 'mouse-pointer-click';

    protected static ?int $navigationSort = 5;

    protected static ?string $slug = 'actions';

    public static function getNavigationLabel(): string
    {
        return __('playground.showcase.actions.title');
    }

    public function content(Schema $schema): Schema
    {
        return $schema->components([
            Html::make('<p>'.e(__('playground.showcase.actions.intro')).'</p>'),
        ]);
    }

    protected function getHeaderActions(): array
    {
        return [
            Action::make('onboard')
                ->label(__('playground.showcase.actions.wizard'))
                ->icon('list-ordered')
                ->steps([
                    Step::make(__('playground.showcase.actions.account'))->schema([TextInput::make('email')->label(__('playground.fields.email'))->email()->required()]),
                    Step::make(__('playground.showcase.actions.profile'))->description(__('playground.showcase.actions.profile_description'))->schema([Textarea::make('bio')->label(__('playground.showcase.actions.bio'))->rows(3)]),
                    Step::make(__('playground.showcase.actions.confirm'))->schema([Toggle::make('terms')->label(__('playground.showcase.actions.agree'))->accepted()]),
                ])
                ->action(fn (array $data) => Notification::make()->title(__('playground.showcase.actions.wizard_finished'))->body($data['email'])->success()->send()),
            Action::make('review')
                ->label(__('playground.showcase.actions.nested'))
                ->icon('layers')
                ->schema([TextInput::make('note')->label(__('playground.showcase.actions.note'))->required()])
                ->extraModalFooterActions([
                    Action::make('preview')
                        ->label(__('playground.showcase.actions.preview'))
                        ->schema([TextInput::make('email')->label(__('playground.fields.email'))->email()->required()])
                        ->action(fn (array $data) => Notification::make()->title(__('playground.showcase.actions.preview_sent'))->body($data['email'])->success()->send()),
                    Action::make('publish')
                        ->label(__('playground.showcase.actions.publish'))
                        ->requiresConfirmation()
                        ->cancelParentActions()
                        ->action(fn () => Notification::make()->title(__('playground.showcase.actions.published'))->success()->send()),
                ])
                ->action(fn (array $data) => Notification::make()->title(__('playground.showcase.actions.review_saved'))->body($data['note'])->success()->send()),
            Action::make('ping')
                ->label(__('playground.showcase.actions.rate_limited'))
                ->icon('timer')
                ->color('warning')
                ->rateLimit(2, 60)
                ->action(fn () => Notification::make()->title(__('playground.showcase.actions.pong'))->success()->send()),
            Action::make('boom')
                ->label(__('playground.showcase.actions.server_error'))
                ->icon('bug')
                ->color('gray')
                ->schema([TextInput::make('reason')->label(__('playground.showcase.actions.reason'))->default(__('playground.showcase.actions.reason_default'))])
                ->action(function (): void {
                    throw new RuntimeException('Boom: a deliberate server error, shown as a toast');
                }),
            Action::make('rotate')
                ->label(__('playground.showcase.actions.password_confirmation'))
                ->icon('key-round')
                ->color('danger')
                ->requiresPasswordConfirmation(rememberForMinutes: 0)
                ->action(fn () => Notification::make()->title(__('playground.showcase.actions.key_rotated'))->success()->send()),
        ];
    }
}
