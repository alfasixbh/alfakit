<?php

declare(strict_types=1);

namespace App\Models;

use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\AlfakitWorkflows\ApprovalStep;
use AlfaSix\AlfakitWorkflows\Concerns\HasWorkflow;
use AlfaSix\AlfakitWorkflows\State;
use AlfaSix\AlfakitWorkflows\Transition;
use AlfaSix\AlfakitWorkflows\Workflow;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A customer's return / refund request on an order, run through an approval workflow
 * (alfasix/alfakit-workflows): support agents open and submit it, an owner or manager of the
 * store approves or rejects it, and an approved return is refunded.
 *
 * @property int $id
 * @property int $store_id
 * @property int $order_id
 * @property int|null $customer_id
 * @property int|null $requested_by_id
 * @property string $number
 * @property string $reason
 * @property string|null $details
 * @property string $amount
 * @property string|null $state
 * @property string|null $refund_reference
 * @property Carbon|null $refunded_at
 */
#[Fillable(['store_id', 'order_id', 'customer_id', 'requested_by_id', 'number', 'reason', 'details', 'amount', 'state', 'refund_reference', 'refunded_at'])]
class ReturnRequest extends Model
{
    use HasWorkflow;

    public const REASONS = ['damaged', 'wrong_item', 'not_as_described', 'allergy', 'changed_mind'];

    public static function workflow(): Workflow
    {
        return Workflow::make('return')
            ->label(fn (): string => __('plugins.returns.workflow'))
            ->states([
                State::make('requested')->label(fn (): string => __('plugins.returns.states.requested'))->color('gray')->icon('inbox'),
                State::make('awaiting_approval')->label(fn (): string => __('plugins.returns.states.awaiting_approval'))->color('warning')->icon('hourglass'),
                State::make('approved')->label(fn (): string => __('plugins.returns.states.approved'))->color('success')->icon('badge-check'),
                State::make('rejected')->label(fn (): string => __('plugins.returns.states.rejected'))->color('danger')->icon('circle-x'),
                State::make('refunded')->label(fn (): string => __('plugins.returns.states.refunded'))->color('primary')->icon('banknote')->final(),
                State::make('closed')->label(fn (): string => __('plugins.returns.states.closed'))->icon('archive')->final(),
            ])
            ->transitions([
                Transition::make('submit')
                    ->label(fn (): string => __('plugins.returns.transitions.submit'))
                    ->icon('send')
                    ->from('requested')
                    ->to('approved')
                    ->withComment()
                    ->requiresApproval([
                        ApprovalStep::make('manager')
                            ->label(fn (): string => __('plugins.returns.steps.manager'))
                            ->role(['owner', 'manager'])
                            ->dueIn('2 days')
                            ->remindEvery('1 day'),
                    ])
                    ->pendingState('awaiting_approval')
                    ->rejectedState('rejected'),
                Transition::make('refund')
                    ->label(fn (): string => __('plugins.returns.transitions.refund'))
                    ->icon('banknote')
                    ->color('primary')
                    ->from('approved')
                    ->to('refunded')
                    ->authorize(fn (ReturnRequest $record, User $user): bool => $user->hasStaffRole('manager', $record->store))
                    ->form([
                        TextInput::make('reference')->label(fn (): string => __('plugins.returns.fields.refund_reference'))->required()->maxLength(64)
                            ->default(fn (): string => 'RF-'.strtoupper(substr(md5((string) microtime(true)), 0, 8))),
                    ])
                    ->using(function (ReturnRequest $record, array $data): void {
                        $record->refund_reference = (string) $data['reference'];
                        $record->refunded_at = now();
                        $record->recordRefund();
                    }),
                Transition::make('reopen')
                    ->label(fn (): string => __('plugins.returns.transitions.reopen'))
                    ->icon('rotate-ccw')
                    ->from('rejected')
                    ->to('requested')
                    ->requiresComment(),
                Transition::make('close')
                    ->label(fn (): string => __('plugins.returns.transitions.close'))
                    ->icon('archive')
                    ->color('gray')
                    ->from('rejected')
                    ->to('closed'),
            ])
            ->initial('requested');
    }

    /** The refund payment on the order, and the order's status, once the money went back. */
    public function recordRefund(): void
    {
        $order = $this->order;

        $order->payments()->create([
            'amount' => $this->amount,
            'currency' => $order->currency,
            'method' => $order->payments()->value('method') ?? PaymentMethod::cases()[0]->value,
            'status' => PaymentStatus::Refunded,
            'reference' => $this->refund_reference,
            'paid_at' => now(),
        ]);

        $order->transitionTo(OrderStatus::Refunded, __('plugins.returns.timeline_note', ['number' => $this->number]))->save();
    }

    public static function nextNumber(): string
    {
        return sprintf('RMA-%05d', ((int) static::query()->max('id')) + 1001);
    }

    /** @return array<string, string> */
    public static function reasonOptions(): array
    {
        return collect(self::REASONS)->mapWithKeys(fn (string $reason): array => [$reason => __('plugins.returns.reasons.'.$reason)])->all();
    }

    /** @return BelongsTo<Store, $this> */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /** @return BelongsTo<Order, $this> */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /** @return BelongsTo<Customer, $this> */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /** @return BelongsTo<User, $this> */
    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by_id');
    }

    protected function casts(): array
    {
        return ['amount' => 'decimal:2', 'refunded_at' => 'datetime'];
    }
}
