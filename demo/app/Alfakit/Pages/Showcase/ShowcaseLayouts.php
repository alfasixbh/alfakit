<?php

declare(strict_types=1);

namespace App\Alfakit\Pages\Showcase;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Forms\Components\Textarea;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Forms\Components\Toggle;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Schemas\Components\Callout;
use AlfaSix\Alfakit\Schemas\Components\EmptyState;
use AlfaSix\Alfakit\Schemas\Components\Fieldset;
use AlfaSix\Alfakit\Schemas\Components\Flex;
use AlfaSix\Alfakit\Schemas\Components\Grid;
use AlfaSix\Alfakit\Schemas\Components\Icon;
use AlfaSix\Alfakit\Schemas\Components\Image;
use AlfaSix\Alfakit\Schemas\Components\Section;
use AlfaSix\Alfakit\Schemas\Components\Split;
use AlfaSix\Alfakit\Schemas\Components\Tabs;
use AlfaSix\Alfakit\Schemas\Components\Tabs\Tab;
use AlfaSix\Alfakit\Schemas\Components\Text;
use AlfaSix\Alfakit\Schemas\Components\UnorderedList;
use AlfaSix\Alfakit\Schemas\Components\Wizard;
use AlfaSix\Alfakit\Schemas\Components\Wizard\Step;
use AlfaSix\Alfakit\Schemas\Schema;
use App\Demo\Catalog;

/**
 * Showcase: layout components. The wizard, fieldset, grid and split carry real fields (so
 * they live in the form); the prime components (callout, empty state, icon, image, list,
 * tabs, sections) are page content.
 */
class ShowcaseLayouts extends ShowcasePage
{
    protected static string $key = 'layouts';

    protected static ?string $navigationIcon = 'layout-template';

    protected static ?int $navigationSort = 2;

    public function mount(mixed ...$parameters): void
    {
        $this->formData = [
            'store_name' => 'Maison Alfa Manama',
            'city' => 'Manama',
            'country' => 'BH',
            'carrier' => Catalog::CARRIERS[0]['carrier'],
            'gift_receipt' => true,
            'recipient' => 'Noor Haddad',
            'line1' => 'Building 12, Road 2831',
            'postal_code' => '328',
        ];
    }

    public function form(Schema $schema): Schema
    {
        return $schema->components([
            Section::make(self::t('sections.wizard'))
                ->description(self::t('sections.wizard_help'))
                ->icon('footprints')
                ->schema([
                    Wizard::make([
                        Step::make(self::t('wizard.store'))
                            ->description(self::t('wizard.store_help'))
                            ->icon('store')
                            ->schema([
                                Grid::make(['default' => 1, '@md' => 2, '@xl' => 3])->schema([
                                    TextInput::make('store_name')->label(self::t('fields.store_name'))->required()->maxLength(80),
                                    TextInput::make('city')->label(self::t('fields.city'))->required()->maxLength(80),
                                    Select::make('country')
                                        ->label(self::t('fields.country'))
                                        ->options(['BH' => 'Bahrain', 'AE' => 'United Arab Emirates', 'GB' => 'United Kingdom', 'FR' => 'France'])
                                        ->native(false)
                                        ->required(),
                                ]),
                            ]),
                        Step::make(self::t('wizard.delivery'))
                            ->description(self::t('wizard.delivery_help'))
                            ->icon('truck')
                            ->schema([
                                Fieldset::make(self::t('fields.address'))->schema([
                                    TextInput::make('recipient')->label(self::t('fields.recipient'))->required(),
                                    TextInput::make('line1')->label(self::t('fields.line1'))->required(),
                                    TextInput::make('postal_code')->label(self::t('fields.postal_code')),
                                ])->columns(['default' => 1, '@md' => 3]),
                                Split::make([
                                    Select::make('carrier')
                                        ->label(self::t('fields.carrier'))
                                        ->options(collect(Catalog::CARRIERS)->pluck('carrier', 'carrier')->all())
                                        ->native(false),
                                    Toggle::make('gift_receipt')->label(self::t('fields.gift_receipt'))->inline(false)->grow(false),
                                ])->from('md')->verticallyAlignEnd(),
                            ]),
                        Step::make(self::t('wizard.review'))
                            ->description(self::t('wizard.review_help'))
                            ->icon('clipboard-check')
                            ->schema([
                                Textarea::make('instructions')->label(self::t('fields.instructions'))->rows(3)->placeholder(self::t('fields.instructions_placeholder')),
                                Callout::make(self::t('wizard.ready'))->description(self::t('wizard.ready_help'))->success(),
                            ]),
                    ])
                        ->skippable()
                        ->persistStepInQueryString()
                        ->submitActionLabel(self::t('wizard.submit')),
                ]),
        ]);
    }

    public function content(Schema $schema): Schema
    {
        return $schema->components([
            Grid::make(['default' => 1, '@lg' => 3])->schema([
                Section::make(self::t('sections.section'))
                    ->description(self::t('sections.section_help'))
                    ->icon('rectangle-horizontal')
                    ->collapsible()
                    ->headerActions([
                        Action::make('ping')->label(self::t('actions.ping'))->icon('bell')->link()->action(fn () => Notification::make()->title(self::t('notifications.pinged'))->info()->send()),
                    ])
                    ->schema([
                        Text::make(self::t('texts.section_body')),
                        UnorderedList::make([
                            self::t('lists.collapsible'),
                            self::t('lists.aside'),
                            self::t('lists.compact'),
                            self::t('lists.header_actions'),
                        ])->size('sm'),
                    ])
                    ->columnSpan(['@lg' => 2]),
                Section::make(self::t('sections.compact'))
                    ->compact()
                    ->secondary()
                    ->icon('minimize-2')
                    ->schema([
                        Flex::make([
                            Icon::make('sparkles')->color('warning')->size('lg')->grow(false),
                            Text::make(self::t('texts.compact_body'))->size('sm'),
                        ])->verticallyAlignCenter(),
                    ]),
            ]),

            Section::make(self::t('sections.aside'))
                ->description(self::t('sections.aside_help'))
                ->aside()
                ->schema([
                    Grid::make(['default' => 1, '@sm' => 2, '@xl' => 4])->schema([
                        Text::make(self::t('texts.cq_a'))->badge()->color('primary'),
                        Text::make(self::t('texts.cq_b'))->badge()->color('info'),
                        Text::make(self::t('texts.cq_c'))->badge()->color('success'),
                        Text::make(self::t('texts.cq_d'))->badge()->color('warning'),
                    ]),
                    Text::make(self::t('texts.cq_body'))->size('sm')->color('gray'),
                ]),

            Tabs::make(self::t('sections.tabs'))
                ->tabs([
                    Tab::make(self::t('tabs.callouts'))
                        ->icon('message-square-warning')
                        ->schema([
                            Grid::make(['default' => 1, '@md' => 2])->schema([
                                Callout::make(self::t('callouts.info'))->description(self::t('callouts.info_help'))->info()->icon('info'),
                                Callout::make(self::t('callouts.success'))->description(self::t('callouts.success_help'))->success(),
                                Callout::make(self::t('callouts.warning'))->description(self::t('callouts.warning_help'))->warning()
                                    ->actions([Action::make('review_stock')->label(self::t('actions.review_stock'))->link()->url('#')]),
                                Callout::make(self::t('callouts.danger'))->description(self::t('callouts.danger_help'))->danger(),
                            ]),
                        ]),
                    Tab::make(self::t('tabs.empty_state'))
                        ->icon('inbox')
                        ->schema([
                            EmptyState::make(self::t('empty.heading'))
                                ->description(self::t('empty.description'))
                                ->icon('package-open')
                                ->actions([
                                    Action::make('import_sample')
                                        ->label(self::t('actions.import_sample'))
                                        ->icon('download')
                                        ->button()
                                        ->action(fn () => Notification::make()->title(self::t('notifications.imported'))->success()->send()),
                                ]),
                            Text::make(self::t('empty.footer'))->size('sm')->color('gray'),
                        ]),
                    Tab::make(self::t('tabs.media'))
                        ->icon('image')
                        ->badge('3')
                        ->schema([
                            Grid::make(['default' => 1, '@md' => 3])->schema([
                                Image::make('/brand/alfakit-mascot-color.svg', self::t('media.mascot'))->imageHeight('9rem')->alignCenter()->tooltip(self::t('media.mascot')),
                                Image::make('/brand/alfakit-stacked-color.svg', self::t('media.stacked'))->imageHeight('9rem')->alignCenter(),
                                Flex::make([
                                    Icon::make('palette')->color('primary')->size('lg')->tooltip('#073B78')->grow(false),
                                    Icon::make('flame')->color('warning')->size('lg')->tooltip('#F47A22')->grow(false),
                                    Icon::make('sun')->color('gray')->size('lg')->tooltip('#FFF4E4')->grow(false),
                                ])->verticallyAlignCenter(),
                            ]),
                        ]),
                ])
                ->persistTabInQueryString()
                ->contained(),
        ]);
    }
}
