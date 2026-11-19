<?php

declare(strict_types=1);

namespace App\Alfakit\Showcase\Pages;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Actions\ActionGroup;
use AlfaSix\Alfakit\Actions\BulkAction;
use AlfaSix\Alfakit\Forms\Components\Checkbox;
use AlfaSix\Alfakit\Forms\Components\CheckboxList;
use AlfaSix\Alfakit\Forms\Components\ColorPicker;
use AlfaSix\Alfakit\Forms\Components\DatePicker;
use AlfaSix\Alfakit\Forms\Components\DateTimePicker;
use AlfaSix\Alfakit\Forms\Components\KeyValue;
use AlfaSix\Alfakit\Forms\Components\Radio;
use AlfaSix\Alfakit\Forms\Components\Repeater;
use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Forms\Components\TagsInput;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Forms\Components\TimePicker;
use AlfaSix\Alfakit\Infolists\Components\CodeEntry;
use AlfaSix\Alfakit\Infolists\Components\ImageEntry;
use AlfaSix\Alfakit\Infolists\Components\KeyValueEntry;
use AlfaSix\Alfakit\Infolists\Components\RepeatableEntry;
use AlfaSix\Alfakit\Infolists\Components\TextEntry;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Pages\Page;
use AlfaSix\Alfakit\Schemas\Components\Fieldset;
use AlfaSix\Alfakit\Schemas\Components\Section;
use AlfaSix\Alfakit\Schemas\Components\Tabs;
use AlfaSix\Alfakit\Schemas\Components\Tabs\Tab;
use AlfaSix\Alfakit\Schemas\Components\Utilities\Set;
use AlfaSix\Alfakit\Schemas\Components\Wizard;
use AlfaSix\Alfakit\Schemas\Components\Wizard\Step;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Tables\Columns\SelectColumn;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Columns\TextInputColumn;
use AlfaSix\Alfakit\Tables\Columns\ToggleColumn;
use AlfaSix\Alfakit\Tables\Enums\PaginationMode;
use AlfaSix\Alfakit\Tables\Filters\Filter;
use AlfaSix\Alfakit\Tables\Filters\SelectFilter;
use AlfaSix\Alfakit\Tables\Table;
use App\Alfakit\Resources\PostResource;
use App\Alfakit\Showcase\Clusters\Showcase;
use App\Alfakit\Showcase\Widgets\GalleryChart;
use App\Models\Post;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

/**
 * Showcase: the documented fields, layouts, table columns, filters, actions, entries and
 * chart filters that no other playground page shows, so the browser tests can reach them.
 * The form only validates ("Save" shows a notification); the table edits the seeded posts.
 */
class ShowcaseGallery extends Page
{
    protected static ?string $cluster = Showcase::class;

    protected static ?string $navigationIcon = 'layout-grid';

    protected static ?int $navigationSort = 6;

    protected static ?string $slug = 'gallery';

    public static function getNavigationLabel(): string
    {
        return __('playground.showcase.gallery.title');
    }

    public function mount(mixed ...$parameters): void
    {
        $this->formData = $this->seed();
    }

    /**
     * @return array<string, mixed>
     */
    protected function seed(): array
    {
        return [
            'plan' => 'basic',
            'notify' => ['email'],
            'languages' => ['php'],
            'keywords' => ['alpha'],
            'brand' => '#2563eb',
            'accent_rgb' => 'rgb(37, 99, 235)',
            'reference' => 'REF-0001',
            'locked' => 'Cannot be changed',
            'emails' => ['first@example.com'],
            'settings' => ['theme' => 'light', 'density' => 'compact'],
        ];
    }

    public function form(Schema $schema): Schema
    {
        $options = ['email' => __('playground.showcase.gallery.option_email'), 'sms' => __('playground.showcase.gallery.option_sms'), 'push' => __('playground.showcase.gallery.option_push')];

        return $schema->components([
            Section::make(__('playground.showcase.gallery.wizard'))
                ->schema([
                    Wizard::make([
                        Step::make(__('playground.showcase.gallery.step_account'))->schema([
                            TextInput::make('wizard_email')->label(__('playground.showcase.gallery.wizard_email'))->email()->required(),
                        ]),
                        Step::make(__('playground.showcase.gallery.step_plan'))->schema([
                            Radio::make('plan')
                                ->label(__('playground.showcase.gallery.plan'))
                                ->options(['basic' => __('playground.showcase.gallery.plan_basic'), 'pro' => __('playground.showcase.gallery.plan_pro'), 'team' => __('playground.showcase.gallery.plan_team')])
                                ->required(),
                        ]),
                        Step::make(__('playground.showcase.gallery.step_confirm'))->schema([
                            Checkbox::make('terms')->label(__('playground.showcase.gallery.terms'))->accepted(),
                        ]),
                    ]),
                ]),
            Tabs::make()->tabs([
                Tab::make(__('playground.showcase.gallery.tab_choices'))->schema([
                    CheckboxList::make('notify')->label(__('playground.showcase.gallery.notify'))->options($options)->bulkToggleable(),
                    Select::make('languages')
                        ->label(__('playground.showcase.gallery.languages'))
                        ->options(['php' => 'PHP', 'ts' => 'TypeScript', 'go' => 'Go', 'rust' => 'Rust'])
                        ->multiple()
                        ->searchable(),
                    TagsInput::make('keywords')->label(__('playground.showcase.gallery.keywords')),
                ]),
                Tab::make(__('playground.showcase.gallery.tab_dates'))->schema([
                    DatePicker::make('starts_on')
                        ->label(__('playground.showcase.gallery.starts_on'))
                        ->native(false)
                        ->displayFormat('d/m/Y')
                        // The 15th and 16th of the current month can't be picked.
                        ->disabledDates(fn (): array => [now()->startOfMonth()->addDays(14)->toDateString(), now()->startOfMonth()->addDays(15)->toDateString()]),
                    TimePicker::make('opens_at')->label(__('playground.showcase.gallery.opens_at')),
                    DateTimePicker::make('goes_live_at')->label(__('playground.showcase.gallery.goes_live_at'))->seconds(false),
                ]),
                Tab::make(__('playground.showcase.gallery.tab_colours'))->schema([
                    ColorPicker::make('brand')->label(__('playground.showcase.gallery.brand')),
                    ColorPicker::make('accent_rgb')->label(__('playground.showcase.gallery.accent_rgb'))->rgb(),
                ]),
            ]),
            Fieldset::make(__('playground.showcase.gallery.contact'))->schema([
                TextInput::make('phone')
                    ->label(__('playground.showcase.gallery.phone'))
                    ->tel()
                    ->mask('(999) 999-9999')
                    ->placeholder('(555) 010-0000')
                    ->hint(__('playground.showcase.gallery.phone_hint'))
                    ->helperText(__('playground.showcase.gallery.phone_help')),
                TextInput::make('reference')->label(__('playground.showcase.gallery.reference'))->readOnly(),
                TextInput::make('locked')->label(__('playground.showcase.gallery.locked'))->disabled(),
                TextInput::make('source')
                    ->label(__('playground.showcase.gallery.source'))
                    ->live(debounce: 400)
                    ->afterStateUpdated(fn (Set $set, ?string $state) => $set('mirror', mb_strtoupper((string) $state))),
                TextInput::make('mirror')->label(__('playground.showcase.gallery.mirror'))->readOnly(),
            ]),
            Section::make(__('playground.showcase.gallery.lists'))->schema([
                Repeater::make('emails')
                    ->label(__('playground.showcase.gallery.emails'))
                    ->simple(TextInput::make('email')->email()->required())
                    ->minItems(1)
                    ->maxItems(3),
                KeyValue::make('settings')->label(__('playground.showcase.gallery.settings'))->addable(false),
            ]),
        ]);
    }

    public function infolist(Schema $schema): Schema
    {
        return $schema->components([
            Section::make(__('playground.showcase.gallery.entries'))->schema([
                KeyValueEntry::make('specs')->label(__('playground.showcase.gallery.specs'))->state(['Weight' => '1.2 kg', 'Colour' => 'Navy']),
                RepeatableEntry::make('contacts')
                    ->label(__('playground.showcase.gallery.contacts'))
                    ->state([['name' => 'Ada Lovelace', 'role' => 'Engineer'], ['name' => 'Grace Hopper', 'role' => 'Admiral']])
                    ->schema([
                        TextEntry::make('name')->label(__('playground.fields.name')),
                        TextEntry::make('role')->label(__('playground.showcase.gallery.role')),
                    ]),
                CodeEntry::make('snippet')->label(__('playground.showcase.gallery.snippet'))->state("{\n    \"debug\": true\n}")->grammar('json'),
                ImageEntry::make('logo')->label(__('playground.showcase.gallery.logo'))->state(url('/apple-touch-icon.png'))->alt(__('playground.showcase.gallery.logo_alt'))->imageSize(48),
            ]),
        ]);
    }

    public function table(Table $table): Table
    {
        $statuses = ['draft' => __('playground.status.draft'), 'review' => __('playground.status.review'), 'published' => __('playground.status.published')];

        return $table
            ->query(Post::query())
            ->columns([
                TextColumn::make('title')->label(__('playground.fields.title'))->searchable(isIndividual: true),
                SelectColumn::make('status')->label(__('playground.fields.status'))->options($statuses)->selectablePlaceholder(false),
                TextInputColumn::make('views')->label(__('playground.fields.views'))->type('number')->rules(['required', 'integer', 'min:0']),
                ToggleColumn::make('is_featured')->label(__('playground.fields.is_featured')),
                TextColumn::make('published_at')->label(__('playground.fields.published_at'))->date(),
            ])
            ->filters([
                Filter::make('published_between')
                    ->label(__('playground.showcase.gallery.published_between'))
                    ->schema([
                        DatePicker::make('from')->label(__('playground.showcase.gallery.from')),
                        DatePicker::make('until')->label(__('playground.showcase.gallery.until')),
                    ])
                    ->query(fn (Builder $query, array $data): Builder => $query
                        ->when($data['from'] ?? null, fn (Builder $query, string $date) => $query->whereDate('published_at', '>=', $date))
                        ->when($data['until'] ?? null, fn (Builder $query, string $date) => $query->whereDate('published_at', '<=', $date))),
                Filter::make('min_views')
                    ->label(__('playground.showcase.gallery.min_views'))
                    ->schema([TextInput::make('value')->label(__('playground.showcase.gallery.min_views'))->numeric()])
                    ->query(fn (Builder $query, array $data): Builder => $query->when(is_numeric($data['value'] ?? null), fn (Builder $query) => $query->where('views', '>=', (int) $data['value']))),
                SelectFilter::make('status')->label(__('playground.fields.status'))->options($statuses)->default(['value' => 'published']),
            ])
            ->groupedBulkActions([
                BulkAction::make('feature')
                    ->label(__('playground.showcase.gallery.feature'))
                    ->icon('star')
                    ->action(function (Collection $records): void {
                        $records->each->update(['is_featured' => true]);

                        Notification::make()->title(__('playground.showcase.gallery.featured', ['count' => $records->count()]))->success()->send();
                    }),
                BulkAction::make('unfeature')
                    ->label(__('playground.showcase.gallery.unfeature'))
                    ->icon('star-off')
                    ->action(function (Collection $records): void {
                        $records->each->update(['is_featured' => false]);

                        Notification::make()->title(__('playground.showcase.gallery.unfeatured', ['count' => $records->count()]))->success()->send();
                    }),
            ])
            ->defaultSort('id')
            ->paginationMode(PaginationMode::Simple)
            ->paginationPageOptions([5, 10])
            ->defaultPaginationPageOption(5);
    }

    protected function getHeaderWidgets(): array
    {
        return [GalleryChart::class];
    }

    protected function getHeaderActions(): array
    {
        return [
            Action::make('details')
                ->label(__('playground.showcase.gallery.slide_over'))
                ->icon('panel-right-open')
                ->slideOver()
                ->schema([TextInput::make('note')->label(__('playground.showcase.gallery.note'))->required()])
                ->action(fn (array $data) => Notification::make()->title(__('playground.showcase.gallery.note_saved'))->body($data['note'])->success()->send()),
            Action::make('docs')
                ->label(__('playground.showcase.gallery.open_docs'))
                ->icon('external-link')
                ->color('gray')
                ->url('https://alfakit.dev/docs', shouldOpenInNewTab: true),
            Action::make('posts')
                ->label(__('playground.showcase.gallery.open_posts'))
                ->icon('arrow-right')
                ->color('gray')
                ->url(fn (): string => PostResource::getUrl()),
            Action::make('archive')
                ->label(__('playground.showcase.gallery.disabled_action'))
                ->icon('archive')
                ->color('gray')
                ->disabled()
                ->tooltip(__('playground.showcase.gallery.disabled_tooltip'))
                ->action(fn () => Notification::make()->title('Archived')->success()->send()),
            ActionGroup::make([
                Action::make('ping')
                    ->label(__('playground.showcase.gallery.group_ping'))
                    ->icon('bell')
                    ->action(fn () => Notification::make()->title(__('playground.showcase.gallery.group_pinged'))->success()->send()),
                Action::make('reset')
                    ->label(__('playground.showcase.gallery.group_reset'))
                    ->icon('rotate-ccw')
                    ->requiresConfirmation()
                    ->action(fn () => Notification::make()->title(__('playground.showcase.gallery.group_reset_done'))->success()->send()),
            ])->label(__('playground.showcase.gallery.group'))->button(),
        ];
    }

    protected function getFormActions(): array
    {
        return [
            Action::make('save')
                ->label(__('playground.showcase.save'))
                ->button()
                ->form(fn () => $this->getForm()->getComponents(withHidden: true))
                // The action builds its own form from the page's fields: fill it with what the
                // page was filled with, so fields that compare with the server's values (the
                // locked key-value rows) have something to compare with.
                ->action(function (array $data): void {
                    Notification::make()
                        ->title(__('playground.showcase.validated'))
                        ->body(json_encode([
                            'wizard_email' => $data['wizard_email'] ?? null,
                            'plan' => $data['plan'] ?? null,
                            'notify' => $data['notify'] ?? null,
                            'languages' => $data['languages'] ?? null,
                            'keywords' => $data['keywords'] ?? null,
                            'starts_on' => $data['starts_on'] ?? null,
                            'opens_at' => $data['opens_at'] ?? null,
                            'brand' => $data['brand'] ?? null,
                            'accent_rgb' => $data['accent_rgb'] ?? null,
                            'phone' => $data['phone'] ?? null,
                            'reference' => $data['reference'] ?? null,
                            'locked' => $data['locked'] ?? null,
                            'emails' => $data['emails'] ?? null,
                            'settings' => $data['settings'] ?? null,
                        ], JSON_UNESCAPED_SLASHES))
                        ->success()
                        ->send();
                }),
        ];
    }

    protected function flushCaches(): void
    {
        parent::flushCaches();

        $this->formData = null;
    }
}
