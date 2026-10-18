<?php

declare(strict_types=1);

namespace App\Alfakit\Standalone;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Standalone\Form;
use App\Demo\Shop;
use App\Models\NewsletterSubscriber;

/**
 * Newsletter sign-up in the storefront footer: one field, unique validation, a toast.
 */
class NewsletterForm extends Form
{
    public function form(Schema $schema): Schema
    {
        return $schema->components([
            TextInput::make('email')
                ->label(__('shop.newsletter.label'))
                ->hiddenLabel()
                ->placeholder(__('shop.newsletter.placeholder'))
                ->email()
                ->required()
                ->maxLength(190)
                ->autocomplete('email')
                ->prefixIcon('mail')
                ->unique(NewsletterSubscriber::class, 'email')
                ->validationMessages(['unique' => __('shop.newsletter.duplicate')]),
        ]);
    }

    public function submit(array $data): mixed
    {
        NewsletterSubscriber::query()->create([
            'email' => $data['email'],
            'store_id' => Shop::store()?->id,
            'locale' => app()->getLocale(),
        ]);

        Notification::make()
            ->success()
            ->title(__('shop.newsletter.thanks.title'))
            ->body(__('shop.newsletter.thanks.body'))
            ->send();

        return back();
    }

    public function getSubmitLabel(): string
    {
        return __('shop.newsletter.submit');
    }

    protected function getSubmitAction(): Action
    {
        return parent::getSubmitAction()->rateLimit(5, decaySeconds: 600);
    }
}
