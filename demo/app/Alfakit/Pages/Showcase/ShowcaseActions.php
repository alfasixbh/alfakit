<?php

declare(strict_types=1);

namespace App\Alfakit\Pages\Showcase;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Actions\ActionGroup;
use AlfaSix\Alfakit\Forms\Components\DatePicker;
use AlfaSix\Alfakit\Forms\Components\MoneyInput;
use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Forms\Components\Textarea;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Forms\Components\Toggle;
use AlfaSix\Alfakit\Forms\Components\ToggleButtons;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Schemas\Components\Callout;
use AlfaSix\Alfakit\Schemas\Components\Grid;
use AlfaSix\Alfakit\Schemas\Components\Section;
use AlfaSix\Alfakit\Schemas\Components\Text;
use AlfaSix\Alfakit\Schemas\Components\UnorderedList;
use AlfaSix\Alfakit\Schemas\Components\Utilities\Get;
use AlfaSix\Alfakit\Schemas\Components\Utilities\Set;
use AlfaSix\Alfakit\Schemas\Components\Wizard\Step;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Support\Enums\Alignment;
use AlfaSix\Alfakit\Support\Enums\Width;
use App\Demo\Catalog;
use Illuminate\Support\Str;

/**
 * Showcase: modal variants and action behaviours. Every action only notifies.
 */
class ShowcaseActions extends ShowcasePage
{
    protected static string $key = 'actions';

    protected static ?string $navigationIcon = 'mouse-pointer-click';

    protected static ?int $navigationSort = 3;

    public function mount(mixed ...$parameters): void
    {
        $this->formData = ['name' => 'Fig Terrace', 'slug' => 'fig-terrace', 'code' => ''];
    }

    protected function getHeaderActions(): array
    {
        return [
            Action::make('announce')
                ->label(self::t('actions.slide_over'))
                ->icon('panel-right-open')
                ->slideOver()
                ->modalWidth(Width::Medium)
                ->modalHeading(self::t('modals.announce_heading'))
                ->modalDescription(self::t('modals.announce_help'))
                ->modalIcon('megaphone')
                ->schema([
                    TextInput::make('subject')->label(self::t('fields.subject'))->required()->maxLength(90),
                    Select::make('audience')->label(self::t('fields.audience'))->options(['vip' => self::t('options.vip'), 'newsletter' => self::t('options.newsletter'), 'all' => self::t('options.all')])->native(false)->required(),
                    DatePicker::make('send_on')->label(self::t('fields.send_on'))->native(false)->minDate(today()),
                    Textarea::make('body')->label(self::t('fields.body'))->rows(6)->required()->minLength(20),
                ])
                ->modalSubmitActionLabel(self::t('actions.schedule'))
                ->action(fn (array $data) => Notification::make()->title(self::t('notifications.scheduled', ['subject' => $data['subject']]))->success()->send()),

            Action::make('terms')
                ->label(self::t('actions.sticky'))
                ->icon('scroll-text')
                ->modalWidth(Width::TwoExtraLarge)
                ->stickyModalFooter()
                ->modalHeading(self::t('modals.terms_heading'))
                ->modalContent(fn (): array => [
                    Text::make(self::t('modals.terms_intro')),
                    ...array_map(
                        fn (int $i): Section => Section::make(self::t('modals.terms_section', ['number' => $i]))->compact()->schema([Text::make(self::t('modals.terms_body'))->size('sm')->color('gray')]),
                        range(1, 7),
                    ),
                ])
                ->schema([Toggle::make('accepted')->label(self::t('fields.accept_terms'))->accepted()])
                ->modalSubmitActionLabel(self::t('actions.accept'))
                ->action(fn () => Notification::make()->title(self::t('notifications.accepted'))->success()->send()),

            Action::make('onboard')
                ->label(self::t('actions.wizard'))
                ->icon('list-ordered')
                ->modalWidth(Width::Large)
                ->steps([
                    Step::make(self::t('wizard.staff'))->icon('user-round')->schema([
                        TextInput::make('name')->label(self::t('fields.full_name'))->required(),
                        TextInput::make('email')->label(self::t('fields.email'))->email()->required(),
                    ]),
                    Step::make(self::t('wizard.role'))->icon('shield')->schema([
                        ToggleButtons::make('role')
                            ->label(self::t('fields.role'))
                            ->options(['owner' => __('demo.staff_role.owner'), 'manager' => __('demo.staff_role.manager'), 'staff' => __('demo.staff_role.staff')])
                            ->icons(['owner' => 'crown', 'manager' => 'briefcase', 'staff' => 'user'])
                            ->inline()
                            ->required(),
                        Select::make('stores')->label(self::t('fields.stores'))->options(collect(Catalog::STORES)->pluck('name', 'slug')->all())->multiple()->native(false)->required(),
                    ]),
                    Step::make(self::t('wizard.confirm'))->icon('check')->schema([
                        Toggle::make('invite')->label(self::t('fields.send_invite'))->default(true),
                    ]),
                ])
                ->skippableSteps(false)
                ->action(fn (array $data) => Notification::make()->title(self::t('notifications.invited', ['name' => $data['name']]))->success()->send()),

            Action::make('refund')
                ->label(self::t('actions.nested'))
                ->icon('layers')
                ->color('warning')
                ->modalHeading(self::t('modals.refund_heading'))
                ->modalDescription(self::t('modals.refund_help'))
                ->schema([
                    MoneyInput::make('amount')->label(self::t('fields.amount'))->currency('USD')->minorUnits()->required()->minValue(1),
                    Textarea::make('reason')->label(self::t('fields.reason'))->rows(3)->required(),
                ])
                ->extraModalFooterActions([
                    Action::make('preview')
                        ->label(self::t('actions.preview_email'))
                        ->icon('mail')
                        ->schema([TextInput::make('email')->label(self::t('fields.email'))->email()->required()])
                        ->action(fn (array $data) => Notification::make()->title(self::t('notifications.preview_sent', ['email' => $data['email']]))->info()->send()),
                    Action::make('approve')
                        ->label(self::t('actions.approve_close'))
                        ->icon('check-check')
                        ->color('success')
                        ->requiresConfirmation()
                        ->modalIcon('badge-check')
                        ->cancelParentActions()
                        ->action(fn () => Notification::make()->title(self::t('notifications.approved'))->success()->send()),
                ])
                ->action(fn (array $data) => Notification::make()->title(self::t('notifications.refund_saved'))->success()->send()),

            ActionGroup::make([
                Action::make('sync')
                    ->label(self::t('actions.rate_limited'))
                    ->icon('timer')
                    ->rateLimit(2, decaySeconds: 60)
                    ->rateLimitedNotificationTitle(fn (): string => self::t('notifications.rate_limited'))
                    ->action(fn () => Notification::make()->title(self::t('notifications.synced'))->success()->send()),
                Action::make('rotate')
                    ->label(self::t('actions.password'))
                    ->icon('key-round')
                    ->color('danger')
                    ->requiresPasswordConfirmation(rememberForMinutes: 0)
                    ->action(fn () => Notification::make()->title(self::t('notifications.rotated'))->success()->send()),
                Action::make('archive')
                    ->label(self::t('actions.confirm'))
                    ->icon('archive')
                    ->color('gray')
                    ->requiresConfirmation()
                    ->modalAlignment(Alignment::Center)
                    ->modalIcon('archive')
                    ->modalIconColor('warning')
                    ->modalHeading(self::t('modals.archive_heading'))
                    ->modalDescription(self::t('modals.archive_help'))
                    ->action(fn () => Notification::make()->title(self::t('notifications.archived'))->warning()->send()),
                Action::make('quick_note')
                    ->label(self::t('actions.shortcut'))
                    ->icon('keyboard')
                    ->keyBindings(['mod+shift+k'])
                    ->badge('⌘⇧K')
                    ->schema([Textarea::make('note')->label(self::t('fields.note'))->rows(3)->required()->autofocus()])
                    ->action(fn () => Notification::make()->title(self::t('notifications.noted'))->success()->send()),
            ])
                ->label(self::t('actions.more'))
                ->icon('ellipsis-vertical')
                ->button(),
        ];
    }

    public function form(Schema $schema): Schema
    {
        return $schema->components([
            Section::make(self::t('sections.field_actions'))
                ->description(self::t('sections.field_actions_help'))
                ->icon('text-cursor-input')
                ->schema([
                    TextInput::make('name')
                        ->label(self::t('fields.product_name'))
                        ->live(onBlur: true)
                        ->afterStateUpdated(fn (Set $set, ?string $state) => $set('slug', Str::slug((string) $state))),
                    TextInput::make('slug')
                        ->label(self::t('fields.slug'))
                        ->prefix('/products/')
                        ->prefixAction(
                            Action::make('clear')->label(self::t('actions.clear'))->icon('eraser')->iconButton()->color('gray')->action(fn (Set $set) => $set('slug', '')),
                        )
                        ->suffixAction(
                            Action::make('generate')->label(self::t('actions.generate'))->icon('sparkles')->iconButton()->action(fn (Get $get, Set $set) => $set('slug', Str::slug((string) $get('name')))),
                        ),
                    TextInput::make('code')
                        ->label(self::t('fields.discount_code'))
                        ->placeholder('SPRING15')
                        ->hintAction(
                            Action::make('suggest')
                                ->label(self::t('actions.suggest_code'))
                                ->icon('wand-sparkles')
                                ->link()
                                ->schema([
                                    Select::make('kind')->label(self::t('fields.code_kind'))->options(['season' => self::t('options.season'), 'vip' => self::t('options.vip'), 'gift' => self::t('options.gift')])->native(false)->required(),
                                ])
                                ->action(fn (array $data, Set $set) => $set('code', strtoupper($data['kind']).random_int(10, 25))),
                        ),
                ])->columns(['default' => 1, '@md' => 3]),
        ]);
    }

    public function content(Schema $schema): Schema
    {
        return $schema->components([
            Grid::make(['default' => 1, '@lg' => 2])->schema([
                Callout::make(self::t('callouts.try_heading'))
                    ->description(self::t('callouts.try_body'))
                    ->info()
                    ->icon('mouse-pointer-click'),
                Section::make(self::t('sections.what_to_look_for'))->compact()->schema([
                    UnorderedList::make([
                        self::t('lists.server'),
                        self::t('lists.wizard_validation'),
                        self::t('lists.nested'),
                        self::t('lists.rate_limit'),
                        self::t('lists.password'),
                        self::t('lists.shortcut'),
                    ])->size('sm'),
                ]),
            ]),
        ]);
    }
}
