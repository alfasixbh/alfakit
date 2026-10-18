<?php

declare(strict_types=1);

namespace App\Alfakit\Showcase\Pages;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Forms\Components\Builder;
use AlfaSix\Alfakit\Forms\Components\Builder\Block;
use AlfaSix\Alfakit\Forms\Components\CodeEditor;
use AlfaSix\Alfakit\Forms\Components\CodeEditor\Enums\Language;
use AlfaSix\Alfakit\Forms\Components\ModalTableSelect;
use AlfaSix\Alfakit\Forms\Components\Repeater;
use AlfaSix\Alfakit\Forms\Components\Repeater\TableColumn;
use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Forms\Components\Slider;
use AlfaSix\Alfakit\Forms\Components\Textarea;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Forms\Components\ToggleButtons;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Pages\Page;
use AlfaSix\Alfakit\Schemas\Components\Callout;
use AlfaSix\Alfakit\Schemas\Components\EmptyState;
use AlfaSix\Alfakit\Schemas\Components\Section;
use AlfaSix\Alfakit\Schemas\Components\Utilities\Get;
use AlfaSix\Alfakit\Schemas\Components\Utilities\Set;
use AlfaSix\Alfakit\Schemas\Schema;
use App\Alfakit\Forms\Components\SwatchPicker;
use App\Alfakit\Resources\CategoryResource;
use App\Alfakit\Showcase\Clusters\Showcase;
use App\Models\Tag;
use RuntimeException;

/**
 * Showcase: every form field that only had automated tests, on one page.
 * Nothing is persisted; "Save" validates and shows a notification.
 */
class ShowcaseFields extends Page
{
    protected static ?string $cluster = Showcase::class;

    protected static ?string $navigationIcon = 'text-cursor-input';

    protected static ?int $navigationSort = 1;

    protected static ?string $slug = 'fields';

    public static function getNavigationLabel(): string
    {
        return __('playground.showcase.fields.title');
    }

    public function mount(mixed ...$parameters): void
    {
        $this->formData = [
            'status' => 'draft',
            'channels' => ['web'],
            'volume' => 40,
            'accent' => '#2563eb',
            'price' => [200, 800],
            'snippet' => "<?php\n\nreturn ['debug' => true];\n",
            'lines' => [
                ['name' => 'Widget', 'quantity' => 2, 'unit' => 'pcs'],
                ['name' => 'Gadget', 'quantity' => 5, 'unit' => 'box'],
            ],
            'content' => [
                ['type' => 'heading', 'data' => ['content' => 'Welcome', 'level' => 'h2']],
                ['type' => 'paragraph', 'data' => ['content' => 'Builder blocks, each with its own schema.']],
            ],
        ];
    }

    public function form(Schema $schema): Schema
    {
        return $schema->components([
            Section::make(__('playground.showcase.fields.choice_fields'))->schema([
                // A custom field from resources/js/alfakit/fields: no registration needed.
                SwatchPicker::make('accent')
                    ->label(__('playground.showcase.fields.accent'))
                    ->swatches(['#2563eb' => __('playground.showcase.fields.swatches.blue'), '#16a34a' => __('playground.showcase.fields.swatches.green'), '#ea580c' => __('playground.showcase.fields.swatches.orange'), '#db2777' => __('playground.showcase.fields.swatches.pink')])
                    ->required(),
                ToggleButtons::make('status')
                    ->label(__('playground.showcase.fields.status'))
                    ->options(['draft' => __('playground.status.draft'), 'scheduled' => __('playground.status.scheduled'), 'published' => __('playground.status.published')])
                    ->colors(['draft' => 'gray', 'scheduled' => 'warning', 'published' => 'success'])
                    ->icons(['draft' => 'pencil', 'scheduled' => 'clock', 'published' => 'check'])
                    ->inline(),
                ToggleButtons::make('channels')
                    ->label(__('playground.showcase.fields.channels'))
                    ->options(['web' => __('playground.showcase.fields.channel_options.web'), 'email' => __('playground.showcase.fields.channel_options.email'), 'sms' => __('playground.showcase.fields.channel_options.sms')])
                    ->multiple()
                    ->grouped(),
                Slider::make('volume')->label(__('playground.showcase.fields.volume'))->range(minValue: 0, maxValue: 100)->step(5)->tooltips(),
                Slider::make('price')->label(__('playground.showcase.fields.price'))->range(minValue: 0, maxValue: 1000)->step(10)->minDifference(50),
                CodeEditor::make('snippet')->label(__('playground.showcase.fields.snippet'))->language(Language::Php)->maxHeight(240)->columnSpanFull(),
            ])->columns(2),
            Section::make(__('playground.showcase.fields.field_actions'))->schema([
                TextInput::make('title')->label(__('playground.fields.title'))->live(onBlur: true),
                TextInput::make('slug')
                    ->label(__('playground.fields.slug'))
                    ->prefix('/blog/')
                    ->prefixAction(
                        Action::make('clear')
                            ->label(__('playground.showcase.fields.clear'))
                            ->icon('eraser')
                            ->iconButton()
                            ->action(fn (Set $set) => $set('slug', '')),
                    )
                    ->suffixActions([
                        Action::make('generate')
                            ->label(__('playground.showcase.fields.generate'))
                            ->icon('sparkles')
                            ->iconButton()
                            ->action(fn (Get $get, Set $set) => $set('slug', str((string) $get('title'))->slug()->toString())),
                        // A field action that fails on the server: the renderer shows an error toast.
                        Action::make('fail')
                            ->label(__('playground.showcase.fields.fail'))
                            ->icon('bug')
                            ->color('danger')
                            ->iconButton()
                            ->action(function (): void {
                                throw new RuntimeException('Boom: a deliberate field action failure');
                            }),
                    ]),
                ModalTableSelect::make('category_id')
                    ->label(__('playground.fields.category'))
                    ->tableConfiguration(CategoryResource::class)
                    ->recordTitleAttribute('name'),
                Select::make('tag_id')
                    ->label(__('playground.fields.tag'))
                    ->options(fn () => Tag::query()->orderBy('name')->pluck('name', 'id')->all())
                    ->searchable()
                    ->createOptionForm([
                        TextInput::make('name')->label(__('playground.fields.name'))->required()->maxLength(255),
                    ])
                    ->createOptionUsing(fn (array $data) => Tag::query()->create(['name' => $data['name']])->getKey()),
            ])->columns(2),
            Section::make(__('playground.showcase.fields.repeater'))->schema([
                Repeater::make('lines')
                    ->label(__('playground.showcase.fields.lines'))
                    ->table([
                        TableColumn::make(__('playground.fields.name')),
                        TableColumn::make(__('playground.fields.quantity')),
                        TableColumn::make(__('playground.showcase.fields.unit')),
                    ])
                    ->schema([
                        TextInput::make('name')->label(__('playground.fields.name'))->required(),
                        TextInput::make('quantity')->label(__('playground.fields.quantity'))->numeric()->required(),
                        Select::make('unit')->label(__('playground.showcase.fields.unit'))->options(['pcs' => __('playground.showcase.fields.units.pcs'), 'box' => __('playground.showcase.fields.units.box')])->native(false),
                    ])
                    ->reorderable()
                    ->cloneable(),
            ]),
            Section::make(__('playground.showcase.fields.builder'))->schema([
                Builder::make('content')
                    ->label(__('playground.fields.content'))
                    ->blocks([
                        Block::make('heading')
                            ->label(__('playground.showcase.fields.heading'))
                            ->icon('heading')
                            ->schema([
                                TextInput::make('content')->label(__('playground.fields.content'))->required(),
                                Select::make('level')->label(__('playground.showcase.fields.level'))->options(['h2' => 'H2', 'h3' => 'H3'])->default('h2')->native(false),
                            ])
                            ->columns(2),
                        Block::make('paragraph')
                            ->label(__('playground.showcase.fields.paragraph'))
                            ->icon('text')
                            ->schema([Textarea::make('content')->label(__('playground.fields.content'))->required()->rows(3)]),
                    ])
                    ->blockPickerColumns(2)
                    ->collapsible()
                    ->cloneable(),
            ]),
        ]);
    }

    public function content(Schema $schema): Schema
    {
        return $schema->components([
            Callout::make(__('playground.showcase.fields.nothing_saved'))
                ->description(__('playground.showcase.fields.nothing_saved_description'))
                ->info(),
            EmptyState::make(__('playground.showcase.fields.no_drafts'))
                ->description(__('playground.showcase.fields.no_drafts_description'))
                ->icon('inbox')
                ->actions([
                    Action::make('hello')->label(__('playground.showcase.fields.say_hello'))->action(fn () => Notification::make()->title(__('playground.showcase.fields.hello'))->success()->send()),
                ]),
        ]);
    }

    protected function getFormActions(): array
    {
        return [
            Action::make('save')
                ->label(__('playground.showcase.save'))
                ->button()
                ->form(fn () => $this->getForm()->getComponents(withHidden: true))
                ->action(function (array $data): void {
                    Notification::make()
                        ->title(__('playground.showcase.validated'))
                        ->body(__('playground.showcase.fields.saved', ['lines' => count($data['lines'] ?? []), 'blocks' => count($data['content'] ?? [])]))
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
