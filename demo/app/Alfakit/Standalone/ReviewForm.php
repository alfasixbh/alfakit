<?php

declare(strict_types=1);

namespace App\Alfakit\Standalone;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Forms\Components\Textarea;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Forms\Components\ToggleButtons;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Standalone\Form;
use App\Enums\ReviewStatus;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Review;

/**
 * "Write a review" on the storefront product page. The product travels in the context token
 * (typed property, so the token can only resolve a Product). Reviews wait for approval in the
 * admin panel, which is why the toast says so.
 */
class ReviewForm extends Form
{
    public Product $product;

    public function form(Schema $schema): Schema
    {
        return $schema->components([
            ToggleButtons::make('rating')
                ->label(__('shop.review.fields.rating'))
                ->validationAttribute(__('shop.attributes.rating'))
                ->options([5 => '5', 4 => '4', 3 => '3', 2 => '2', 1 => '1'])
                ->icons([5 => 'star', 4 => 'star', 3 => 'star', 2 => 'star', 1 => 'star'])
                ->colors([5 => 'success', 4 => 'success', 3 => 'warning', 2 => 'warning', 1 => 'danger'])
                ->grouped()
                ->required()
                ->rule('integer')
                ->columnSpanFull(),
            TextInput::make('name')
                ->label(__('shop.review.fields.name'))
                ->validationAttribute(__('shop.attributes.name'))
                ->required()
                ->maxLength(120)
                ->autocomplete('name'),
            TextInput::make('email')
                ->label(__('shop.review.fields.email'))
                ->email()
                ->required()
                ->maxLength(190)
                ->helperText(__('shop.review.fields.email_help'))
                ->autocomplete('email'),
            TextInput::make('title')
                ->label(__('shop.review.fields.title'))
                ->required()
                ->maxLength(90)
                ->columnSpanFull(),
            Textarea::make('body')
                ->label(__('shop.review.fields.body'))
                ->validationAttribute(__('shop.attributes.review'))
                ->required()
                ->minLength(30)
                ->maxLength(1500)
                ->rows(5)
                ->columnSpanFull(),
        ])->columns(['default' => 1, '@md' => 2]);
    }

    public function submit(array $data): mixed
    {
        // Known customers (by e-mail, within the shop's store) get a verified-purchase mark
        // when they bought the product; everyone else is a guest reviewer.
        $customer = Customer::query()
            ->where('store_id', $this->product->store_id)
            ->where('email', $data['email'])
            ->first();

        $verified = $customer !== null && $customer->orders()
            ->whereHas('items', fn ($query) => $query->where('product_id', $this->product->id))
            ->exists();

        Review::query()->create([
            'product_id' => $this->product->id,
            'customer_id' => $customer?->id,
            'rating' => (int) $data['rating'],
            'title' => $data['title'],
            'body' => $data['body'],
            'status' => ReviewStatus::Pending,
            'is_verified_purchase' => $verified,
        ]);

        Notification::make()
            ->success()
            ->title(__('shop.review.thanks.title', ['name' => $data['name']]))
            ->body(__('shop.review.thanks.body'))
            ->send();

        return back();
    }

    public function getSubmitLabel(): string
    {
        return __('shop.review.submit');
    }

    protected function getSubmitAction(): Action
    {
        return parent::getSubmitAction()->icon('message-square-text')->rateLimit(3, decaySeconds: 600);
    }
}
