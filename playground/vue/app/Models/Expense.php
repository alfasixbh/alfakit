<?php

declare(strict_types=1);

namespace App\Models;

use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\AlfakitWorkflows\ApprovalStep;
use AlfaSix\AlfakitWorkflows\Concerns\HasWorkflow;
use AlfaSix\AlfakitWorkflows\State;
use AlfaSix\AlfakitWorkflows\Transition;
use AlfaSix\AlfakitWorkflows\Workflow;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * An expense claim (alfasix/alfakit-workflows): drafts are submitted for a super admin's
 * approval, approved claims are paid with a reference, rejected ones can be reopened.
 *
 * @property int $id
 * @property int $user_id
 * @property string $title
 * @property int $amount
 * @property string $currency
 * @property string|null $state
 */
class Expense extends Model
{
    use HasWorkflow;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'paid_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function workflow(): Workflow
    {
        return Workflow::make('expense')
            ->label(fn (): string => __('playground.expenses.workflow'))
            ->states([
                State::make('draft')->label(fn (): string => __('playground.expenses.states.draft'))->color('gray')->icon('file-pen'),
                State::make('submitted')->label(fn (): string => __('playground.expenses.states.submitted'))->color('warning')->icon('hourglass'),
                State::make('approved')->label(fn (): string => __('playground.expenses.states.approved'))->color('success')->icon('badge-check'),
                State::make('rejected')->label(fn (): string => __('playground.expenses.states.rejected'))->color('danger')->icon('circle-x'),
                State::make('paid')->label(fn (): string => __('playground.expenses.states.paid'))->color('primary')->icon('banknote')->final(),
            ])
            ->transitions([
                Transition::make('submit')
                    ->label(fn (): string => __('playground.expenses.submit'))
                    ->from('draft')
                    ->to('approved')
                    ->guard(fn (Expense $record): bool|string => $record->amount > 0 ?: __('playground.expenses.needs_amount'))
                    ->withComment()
                    ->requiresApproval([
                        ApprovalStep::make('manager')
                            ->label(fn (): string => __('playground.expenses.manager_approval'))
                            ->role('super_admin')
                            ->dueIn('2 days'),
                    ])
                    ->pendingState('submitted')
                    ->rejectedState('rejected'),

                Transition::make('pay')
                    ->label(fn (): string => __('playground.expenses.pay'))
                    ->from('approved')
                    ->to('paid')
                    ->form([
                        TextInput::make('reference')->label(fn (): string => __('playground.fields.payment_reference'))->required()->maxLength(64),
                    ])
                    ->using(function (Expense $record, array $data): void {
                        $record->payment_reference = $data['reference'];
                        $record->paid_at = now();
                    }),

                Transition::make('reopen')
                    ->label(fn (): string => __('playground.expenses.reopen'))
                    ->from('rejected')
                    ->to('draft')
                    ->requiresComment(),
            ])
            ->initial('draft');
    }
}
