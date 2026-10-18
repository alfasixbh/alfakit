<?php

declare(strict_types=1);

namespace App\Alfakit\Standalone;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Forms\Components\Textarea;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Schemas\Components\Utilities\Get;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Standalone\Form;
use App\Demo\Renderer;
use App\Demo\Shop;
use App\Models\ContactMessage;
use Illuminate\Support\Facades\Mail;

/**
 * The storefront contact form (/{renderer}/contact): a guest form with a conditional field,
 * server-side validation, a rate limit per visitor and a toast on success. The message is
 * stored and "mailed" through the log driver.
 */
class ContactForm extends Form
{
    public const TOPICS = ['order', 'product', 'wholesale', 'press', 'other'];

    /** The storefront renderer the message was sent from (`make(['renderer' => …])`). */
    public string $renderer = Renderer::DEFAULT;

    public function form(Schema $schema): Schema
    {
        return $schema->components([
            TextInput::make('name')
                ->label(__('shop.contact.fields.name'))
                ->validationAttribute(__('shop.attributes.name'))
                ->required()
                ->maxLength(120)
                ->autocomplete('name'),
            TextInput::make('email')
                ->label(__('shop.contact.fields.email'))
                ->email()
                ->required()
                ->maxLength(190)
                ->autocomplete('email'),
            Select::make('topic')
                ->label(__('shop.contact.fields.topic'))
                ->options(collect(self::TOPICS)->mapWithKeys(fn (string $topic): array => [$topic => __('shop.contact.topics.'.$topic)])->all())
                ->required()
                ->native(false)
                ->live(),
            TextInput::make('order_number')
                ->label(__('shop.contact.fields.order_number'))
                ->placeholder('MA-2026-000123')
                ->visible(fn (Get $get): bool => $get('topic') === 'order')
                ->required()
                ->maxLength(40),
            Textarea::make('message')
                ->label(__('shop.contact.fields.message'))
                ->required()
                ->minLength(20)
                ->maxLength(2000)
                ->rows(6)
                ->helperText(__('shop.contact.fields.message_help'))
                ->columnSpanFull(),
        ])->columns(['default' => 1, '@md' => 2]);
    }

    public function submit(array $data): mixed
    {
        $message = ContactMessage::query()->create([
            'name' => (string) $data['name'],
            'email' => (string) $data['email'],
            'topic' => (string) $data['topic'],
            'order_number' => $data['order_number'] ?? null,
            'message' => (string) $data['message'],
            'store_id' => Shop::store()?->id,
            'locale' => app()->getLocale(),
            'renderer' => in_array($this->renderer, Renderer::ALL, true) ? $this->renderer : Renderer::DEFAULT,
        ]);

        // The demo mails through the `log` driver: the message lands in storage/logs.
        Mail::raw(
            $message->message,
            fn ($mail) => $mail->to(Shop::store()->email ?? 'hello@alfakit.dev')->replyTo($message->email, $message->name)->subject(__('shop.contact.mail_subject', ['topic' => __('shop.contact.topics.'.$message->topic)])),
        );

        Notification::make()
            ->success()
            ->title(__('shop.contact.thanks.title', ['name' => $message->name]))
            ->body(__('shop.contact.thanks.body', ['email' => $message->email]))
            ->send();

        return back();
    }

    public function getSubmitLabel(): string
    {
        return __('shop.contact.submit');
    }

    /** Three messages per ten minutes per visitor, keyed by IP for guests. */
    protected function getSubmitAction(): Action
    {
        return parent::getSubmitAction()
            ->icon('send')
            ->rateLimit(3, decaySeconds: 600)
            ->rateLimitedNotificationTitle(fn (): string => __('shop.contact.rate_limited'));
    }
}
