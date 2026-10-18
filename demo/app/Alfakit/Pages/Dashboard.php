<?php

declare(strict_types=1);

namespace App\Alfakit\Pages;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Forms\Components\DatePicker;
use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Forms\Components\Toggle;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Pages\Dashboard as BaseDashboard;
use AlfaSix\Alfakit\Pages\Dashboard\Concerns\HasFiltersForm;
use AlfaSix\Alfakit\Schemas\Schema;
use App\Alfakit\Widgets\LatestReviews;
use App\Alfakit\Widgets\OrdersByStatusChart;
use App\Alfakit\Widgets\Plugins\ThisWeekCalendar;
use App\Alfakit\Widgets\RevenueChart;
use App\Alfakit\Widgets\StoreStats;
use App\Alfakit\Widgets\TopProductsTable;
use App\Models\User;

/**
 * The overview of the current store. The filters form is shared by every widget: the date
 * range needs "Apply", while the scope and the live toggle apply as soon as they change.
 */
class Dashboard extends BaseDashboard
{
    use HasFiltersForm;

    protected static ?string $navigationIcon = 'demo::overview';

    public static function getNavigationLabel(): string
    {
        return __('platform.dashboard.title');
    }

    public function getTitle(): string
    {
        return __('platform.dashboard.title');
    }

    public function filtersForm(Schema $schema): Schema
    {
        return $schema->components([
            DatePicker::make('startDate')
                ->label(__('platform.dashboard.filters.start_date'))
                ->default(now()->subDays(29)->toDateString())
                ->maxDate(now()),
            DatePicker::make('endDate')
                ->label(__('platform.dashboard.filters.end_date'))
                ->default(now()->toDateString())
                ->afterOrEqual('startDate')
                ->maxDate(now()),
            Select::make('scope')
                ->label(__('platform.dashboard.filters.scope'))
                ->options([
                    'store' => __('platform.dashboard.filters.scope_store'),
                    'all' => __('platform.dashboard.filters.scope_all'),
                ])
                ->default('store')
                ->native(false)
                ->live(),
            Toggle::make('live')
                ->label(__('platform.dashboard.filters.live'))
                ->helperText(__('platform.dashboard.filters.live_help'))
                ->onIcon('radio')
                ->default(false)
                ->live(),
        ])->columns(['default' => 1, 'md' => 2, 'xl' => 4]);
    }

    public function getWidgets(): array
    {
        return [
            StoreStats::class,
            RevenueChart::class,
            OrdersByStatusChart::class,
            TopProductsTable::class,
            LatestReviews::class,
            // alfasix/alfakit-calendar: promotions and deliveries of the week.
            ThisWeekCalendar::class,
        ];
    }

    public function getColumns(): int|array
    {
        return ['default' => 1, 'md' => 2, 'xl' => 3];
    }

    protected function getHeaderActions(): array
    {
        return [
            Action::make('testNotification')
                ->label(__('platform.dashboard.test_notification.label'))
                ->icon('bell-ring')
                ->color('secondary')
                ->button()
                ->outlined()
                ->rateLimit(10)
                ->action(function (): void {
                    $user = auth()->user();

                    $notification = Notification::make()
                        ->title(__('platform.dashboard.test_notification.title'))
                        ->body(__('platform.dashboard.test_notification.body'))
                        ->success()
                        ->icon('demo::bottle')
                        ->seconds(8);

                    // The toast arrives with this response; the copy in the bell is tenant-aware.
                    $notification->send();

                    if ($user instanceof User) {
                        $notification->sendToDatabase($user);
                    }
                }),
        ];
    }
}
