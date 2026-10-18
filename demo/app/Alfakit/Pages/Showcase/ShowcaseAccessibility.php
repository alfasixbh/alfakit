<?php

declare(strict_types=1);

namespace App\Alfakit\Pages\Showcase;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Forms\Components\DatePicker;
use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Forms\Components\Toggle;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Schemas\Components\Callout;
use AlfaSix\Alfakit\Schemas\Components\Grid;
use AlfaSix\Alfakit\Schemas\Components\Section;
use AlfaSix\Alfakit\Schemas\Components\Text;
use AlfaSix\Alfakit\Schemas\Components\UnorderedList;
use AlfaSix\Alfakit\Schemas\Schema;
use App\Demo\DemoPanel;

/**
 * Showcase: what the renderers do for keyboard and screen-reader users, with a small form
 * to try it on.
 */
class ShowcaseAccessibility extends ShowcasePage
{
    protected static string $key = 'accessibility';

    protected static ?string $navigationIcon = 'accessibility';

    protected static ?int $navigationSort = 7;

    protected function getHeaderActions(): array
    {
        return [
            Action::make('announce')
                ->label(self::t('actions.announce'))
                ->icon('bell-ring')
                ->keyBindings(['mod+shift+a'])
                ->badge('⌘⇧A')
                ->action(fn () => Notification::make()->title(self::t('notifications.announced'))->body(self::t('notifications.announced_body'))->info()->send()),
            Action::make('docs')
                ->label(self::t('actions.docs'))
                ->icon('book-open')
                ->button()
                ->outlined()
                ->url(DemoPanel::docsUrl('advanced/accessibility'), shouldOpenInNewTab: true),
        ];
    }

    public function content(Schema $schema): Schema
    {
        return $schema->components([
            Grid::make(['default' => 1, '@lg' => 3])->schema([
                Section::make(self::t('sections.keyboard'))
                    ->description(self::t('sections.keyboard_help'))
                    ->icon('keyboard')
                    ->schema([
                        UnorderedList::make([
                            self::t('keys.tab'),
                            self::t('keys.arrows'),
                            self::t('keys.escape'),
                            self::t('keys.enter'),
                            self::t('keys.shortcuts'),
                            self::t('keys.search'),
                        ])->size('sm'),
                    ])
                    ->columnSpan(['@lg' => 2]),
                Section::make(self::t('sections.screen_readers'))
                    ->icon('ear')
                    ->schema([
                        UnorderedList::make([
                            self::t('sr.landmarks'),
                            self::t('sr.forms'),
                            self::t('sr.tables'),
                            self::t('sr.modals'),
                        ])->size('sm'),
                    ]),
            ]),
            Grid::make(['default' => 1, '@lg' => 2])->schema([
                Callout::make(self::t('callouts.skip_heading'))->description(self::t('callouts.skip_body'))->info()->icon('corner-down-right'),
                Callout::make(self::t('callouts.motion_heading'))->description(self::t('callouts.motion_body'))->success()->icon('wind'),
            ]),
            Section::make(self::t('sections.contrast'))
                ->compact()
                ->icon('contrast')
                ->schema([
                    Grid::make(['default' => 2, '@md' => 5])->schema([
                        Text::make(self::t('badges.primary'))->badge()->color('primary'),
                        Text::make(self::t('badges.success'))->badge()->color('success'),
                        Text::make(self::t('badges.warning'))->badge()->color('warning'),
                        Text::make(self::t('badges.danger'))->badge()->color('danger'),
                        Text::make(self::t('badges.info'))->badge()->color('info'),
                    ]),
                    Text::make(self::t('texts.contrast'))->size('sm')->color('gray'),
                ]),
        ]);
    }

    public function form(Schema $schema): Schema
    {
        return $schema->components([
            Section::make(self::t('sections.try'))
                ->description(self::t('sections.try_help'))
                ->icon('hand')
                ->schema([
                    TextInput::make('name')->label(self::t('fields.name'))->required()->maxLength(80)->hint(self::t('fields.name_hint'))->hintIcon('info'),
                    Select::make('store')->label(self::t('fields.store'))->options(['manama' => 'Maison Alfa Manama', 'dubai' => 'Maison Alfa Dubai', 'london' => 'Maison Alfa London'])->native(false)->required(),
                    DatePicker::make('visit')->label(self::t('fields.visit'))->native(false)->minDate(today()),
                    Toggle::make('reminder')->label(self::t('fields.reminder'))->helperText(self::t('fields.reminder_help')),
                ])
                ->columns(['default' => 1, '@md' => 2]),
        ]);
    }

    protected function getFormActions(): array
    {
        return [
            Action::make('book')
                ->label(self::t('actions.book'))
                ->icon('calendar-check')
                ->button()
                ->form(fn (): array => $this->getForm()?->getComponents(withHidden: true) ?? [])
                ->action(fn (array $data) => Notification::make()->title(self::t('notifications.booked', ['name' => (string) $data['name']]))->success()->send()),
        ];
    }
}
