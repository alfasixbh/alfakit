<?php

declare(strict_types=1);

namespace App\Alfakit\Plugins\Widgets;

use AlfaSix\Alfakit\Forms\Components\ColorPicker;
use AlfaSix\Alfakit\Forms\Components\DateTimePicker;
use AlfaSix\Alfakit\Forms\Components\Textarea;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Forms\Components\Toggle;
use AlfaSix\AlfakitCalendar\Event;
use AlfaSix\AlfakitCalendar\Widgets\CalendarWidget;
use App\Alfakit\Resources\PostResource;
use App\Models\CalendarEvent;
use App\Models\Post;

/**
 * alfasix/alfakit-calendar: calendar events (create, view, edit, drag and resize) plus the
 * publication dates of posts, which link to the post.
 */
class EventsCalendar extends CalendarWidget
{
    protected static ?string $model = CalendarEvent::class;

    protected static ?string $startAttribute = 'starts_at';

    protected static ?string $endAttribute = 'ends_at';

    protected function getHeading(): ?string
    {
        return __('playground.calendar.heading');
    }

    public function fetchEvents(array $info): array
    {
        $events = CalendarEvent::query()
            ->where('starts_at', '<', $info['end'])
            ->where(fn ($query) => $query->where('ends_at', '>', $info['start'])->orWhere(fn ($query) => $query->whereNull('ends_at')->where('starts_at', '>=', $info['start'])))
            ->get()
            ->map(fn (CalendarEvent $event): Event => Event::make($event)
                ->title($event->title)
                ->start($event->starts_at)
                ->end($event->ends_at)
                ->allDay($event->all_day)
                ->backgroundColor($event->color ?? '#2563eb')
                ->borderColor($event->color ?? '#2563eb'));

        $posts = Post::query()
            ->whereNotNull('published_at')
            ->whereBetween('published_at', [$info['start'], $info['end']])
            ->get()
            ->map(fn (Post $post): Event => Event::make('post-'.$post->getKey())
                ->title(__('playground.calendar.published', ['title' => $post->title]))
                ->start($post->published_at)
                ->allDay()
                ->editable(false)
                ->url(PostResource::getUrl('view', ['record' => $post]))
                ->backgroundColor('#f97316')
                ->borderColor('#f97316'));

        return [...$events->all(), ...$posts->all()];
    }

    public function config(): array
    {
        return ['dayMaxEvents' => true, 'nowIndicator' => true];
    }

    public function getFormSchema(): array
    {
        return [
            TextInput::make('title')->label(__('playground.fields.title'))->required()->maxLength(255),
            DateTimePicker::make('starts_at')->label(__('playground.fields.starts_at'))->required()->seconds(false),
            DateTimePicker::make('ends_at')->label(__('playground.fields.ends_at'))->seconds(false),
            Toggle::make('all_day')->label(__('playground.fields.all_day')),
            ColorPicker::make('color')->label(__('playground.fields.color')),
            Textarea::make('description')->label(__('playground.fields.description'))->rows(3),
        ];
    }
}
