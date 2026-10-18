<?php

declare(strict_types=1);

namespace App\Alfakit\Pages;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Notifications\DatabaseNotificationScope;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Pages\Page;
use AlfaSix\Alfakit\Tables\Columns\IconColumn;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Filters\TernaryFilter;
use AlfaSix\Alfakit\Tables\Table;
use App\Demo\Nav;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Notifications\DatabaseNotification;

/**
 * The signed-in user's database notifications as a table: what the bell shows, with room
 * to read, mark and remove. The query is narrowed by the same tenant scope as the bell, so
 * a notification sent in Dubai is not listed while working in Manama.
 */
class Notifications extends Page
{
    protected static ?string $navigationIcon = 'demo::notifications';

    protected static ?int $navigationSort = 3;

    protected static ?string $slug = 'notifications';

    public static function getNavigationGroup(): ?string
    {
        return Nav::group(Nav::SETTINGS);
    }

    public static function getNavigationLabel(): string
    {
        return __('platform.notifications.title');
    }

    public static function getNavigationBadge(): ?string
    {
        $user = auth()->user();

        if (! $user instanceof User) {
            return null;
        }

        $unread = DatabaseNotificationScope::apply($user->unreadNotifications())->count();

        return $unread > 0 ? (string) $unread : null;
    }

    public function getTitle(): string
    {
        return __('platform.notifications.title');
    }

    public function getSubheading(): ?string
    {
        return __('platform.notifications.description');
    }

    protected function getHeaderActions(): array
    {
        return [
            Action::make('markAllRead')
                ->label(__('platform.notifications.actions.mark_all_read'))
                ->icon('check-check')
                ->button()
                ->outlined()
                ->action(function (): void {
                    $this->query()->whereNull('read_at')->update(['read_at' => now()]);

                    Notification::make()->success()->title(__('platform.notifications.marked_all_read'))->send();
                }),
            Action::make('clearRead')
                ->label(__('platform.notifications.actions.clear_read'))
                ->icon('trash-2')
                ->color('gray')
                ->button()
                ->outlined()
                ->requiresConfirmation()
                ->action(function (): void {
                    $this->query()->whereNotNull('read_at')->delete();

                    Notification::make()->success()->title(__('platform.notifications.cleared'))->send();
                }),
        ];
    }

    public function table(Table $table): Table
    {
        return $table
            ->query(fn (): Builder => $this->query())
            ->columns([
                IconColumn::make('status')
                    ->label('')
                    ->getStateUsing(fn (DatabaseNotification $record): string => (string) ($record->data['icon'] ?? 'alfakit::notifications.'.$this->status($record)))
                    ->color(fn (?DatabaseNotification $record): string => $record === null ? 'gray' : $this->status($record))
                    ->alignCenter(),
                TextColumn::make('title')
                    ->label(__('platform.notifications.columns.title'))
                    ->getStateUsing(fn (DatabaseNotification $record): string => (string) ($record->data['title'] ?? ''))
                    ->description(fn (DatabaseNotification $record): ?string => isset($record->data['body']) ? (string) $record->data['body'] : null)
                    ->weight(fn (?DatabaseNotification $record): string => $record !== null && $record->read_at === null ? 'semibold' : 'normal')
                    ->wrap()
                    ->searchable(query: fn (Builder $query, string $search) => $query->where('data', 'like', '%'.$search.'%')),
                TextColumn::make('type')
                    ->label(__('platform.notifications.columns.status'))
                    ->getStateUsing(fn (DatabaseNotification $record): string => __('platform.notifications.statuses.'.$this->status($record)))
                    ->badge()
                    ->color(fn (?DatabaseNotification $record): string => $record === null ? 'gray' : $this->status($record))
                    ->visibleFrom('md'),
                TextColumn::make('created_at')
                    ->label(__('platform.notifications.columns.received'))
                    ->since()
                    ->sortable(),
                IconColumn::make('read_at')
                    ->label(__('platform.notifications.columns.read'))
                    ->getStateUsing(fn (DatabaseNotification $record): bool => $record->read_at !== null)
                    ->boolean()
                    ->trueIcon('mail-open')
                    ->falseIcon('mail')
                    ->trueColor('gray')
                    ->falseColor('primary')
                    ->alignCenter(),
            ])
            ->filters([
                TernaryFilter::make('unread')
                    ->label(__('platform.notifications.filters.unread'))
                    ->queries(
                        true: fn (Builder $query) => $query->whereNull('read_at'),
                        false: fn (Builder $query) => $query->whereNotNull('read_at'),
                    ),
            ])
            ->recordActions([
                Action::make('markRead')
                    ->label(__('platform.notifications.actions.mark_read'))
                    ->icon('check')
                    ->color('gray')
                    ->visible(fn (DatabaseNotification $record): bool => $record->read_at === null)
                    ->action(fn (DatabaseNotification $record) => $record->markAsRead()),
                Action::make('markUnread')
                    ->label(__('platform.notifications.actions.mark_unread'))
                    ->icon('mail')
                    ->color('gray')
                    ->visible(fn (DatabaseNotification $record): bool => $record->read_at !== null)
                    ->action(fn (DatabaseNotification $record) => $record->markAsUnread()),
                Action::make('delete')
                    ->label(__('platform.notifications.actions.delete'))
                    ->icon('alfakit::actions.delete')
                    ->color('danger')
                    ->requiresConfirmation()
                    ->action(fn (DatabaseNotification $record) => $record->delete()),
            ])
            ->defaultSort('created_at', 'desc')
            ->emptyStateIcon('demo::notifications')
            ->emptyStateHeading(__('platform.notifications.empty_heading'))
            ->emptyStateDescription(__('platform.notifications.empty_description'));
    }

    /** @return Builder<DatabaseNotification> */
    private function query(): Builder
    {
        $user = auth()->user();

        $query = DatabaseNotification::query()
            ->where('notifiable_type', $user instanceof User ? $user->getMorphClass() : '')
            ->where('notifiable_id', $user instanceof User ? $user->getKey() : 0);

        return DatabaseNotificationScope::apply($query);
    }

    private function status(DatabaseNotification $record): string
    {
        $status = $record->data['status'] ?? 'info';

        return in_array($status, ['success', 'info', 'warning', 'danger'], true) ? $status : 'info';
    }
}
