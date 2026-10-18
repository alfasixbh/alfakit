<?php

declare(strict_types=1);

namespace App\Alfakit\Pages\Showcase;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Forms\Components\Toggle;
use AlfaSix\Alfakit\Forms\Components\ToggleButtons;
use AlfaSix\Alfakit\Localization\LocaleResolver;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Schemas\Components\Callout;
use AlfaSix\Alfakit\Schemas\Components\Grid;
use AlfaSix\Alfakit\Schemas\Components\Html;
use AlfaSix\Alfakit\Schemas\Components\Section;
use AlfaSix\Alfakit\Schemas\Components\UnorderedList;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Theming\Theme;
use AlfaSix\Alfakit\Theming\Themes;
use App\Demo\DemoPanel;
use App\Demo\Design;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\HtmlString;

/**
 * Showcase: the live design switcher. The form writes session flags that `DemoPanel` reads
 * on the next request, so the whole panel (in every renderer) follows the choice.
 */
class ShowcaseTheming extends ShowcasePage
{
    protected static string $key = 'theming';

    protected static ?string $navigationIcon = 'palette';

    protected static ?int $navigationSort = 5;

    public function mount(mixed ...$parameters): void
    {
        $panel = $this->getPanel();
        $design = $panel->getDesign();

        $this->formData = [
            'theme' => DemoPanel::theme(),
            ...array_intersect_key($design, Design::DIMENSIONS),
            'density' => Design::density() ?? $panel->getDensity()->value,
            'mobile' => (bool) session(DemoPanel::SESSION_MOBILE, false),
            'locale' => app()->getLocale(),
        ];
    }

    public function form(Schema $schema): Schema
    {
        return $schema->components([
            Section::make(self::t('sections.theme'))
                ->description(self::t('sections.theme_help'))
                ->icon('swatch-book')
                ->schema([
                    ToggleButtons::make('theme')
                        ->label(self::t('fields.theme'))
                        ->options(collect(Themes::all())->mapWithKeys(fn (Theme $theme): array => [$theme->getName() => $theme->getLabel()])->all())
                        ->icons(['neutral' => 'circle', 'alfakit' => 'sparkles', 'minimal' => 'minus', 'soft' => 'cloud', 'corporate' => 'building-2', 'filament' => 'flame'])
                        ->inline()
                        ->required()
                        ->columnSpanFull(),
                ]),
            Section::make(self::t('sections.dimensions'))
                ->description(self::t('sections.dimensions_help'))
                ->icon('sliders-horizontal')
                ->schema(array_map(
                    fn (string $dimension): ToggleButtons => ToggleButtons::make($dimension)
                        ->label(self::t('dimensions.'.$dimension))
                        ->options(collect(Design::DIMENSIONS[$dimension])->mapWithKeys(fn (string $value): array => [$value => self::t('values.'.$dimension.'.'.$value)])->all())
                        ->inline()
                        ->required(),
                    array_keys(Design::DIMENSIONS),
                ))
                ->columns(['default' => 1, '@md' => 2]),
            Section::make(self::t('sections.behaviour'))
                ->description(self::t('sections.behaviour_help'))
                ->icon('smartphone')
                ->schema([
                    ToggleButtons::make('density')
                        ->label(self::t('dimensions.density'))
                        ->options(['comfortable' => self::t('values.density.comfortable'), 'compact' => self::t('values.density.compact')])
                        ->icons(['comfortable' => 'rows-2', 'compact' => 'rows-4'])
                        ->inline()
                        ->required(),
                    Toggle::make('mobile')
                        ->label(self::t('fields.mobile'))
                        ->helperText(self::t('fields.mobile_help'))
                        ->onIcon('smartphone')
                        ->offIcon('panel-left'),
                    ToggleButtons::make('locale')
                        ->label(self::t('fields.direction'))
                        ->options(['en' => self::t('values.direction.ltr'), 'ar' => self::t('values.direction.rtl')])
                        ->icons(['en' => 'align-left', 'ar' => 'align-right'])
                        ->inline()
                        ->helperText(self::t('fields.direction_help')),
                ])
                ->columns(['default' => 1, '@md' => 3]),
        ]);
    }

    protected function getFormActions(): array
    {
        return [
            Action::make('apply')
                ->label(self::t('actions.apply'))
                ->icon('paintbrush')
                ->button()
                ->keyBindings(['mod+s'])
                ->form(fn (): array => $this->getForm()?->getComponents(withHidden: true) ?? [])
                ->action(function (array $data): RedirectResponse {
                    Design::store($data);

                    if (in_array($data['locale'] ?? null, ['en', 'ar'], true)) {
                        session([LocaleResolver::SESSION_KEY => $data['locale']]);
                    }

                    Notification::make()->title(self::t('notifications.applied'))->success()->send();

                    return redirect()->to(static::getUrl());
                }),
            Action::make('reset')
                ->label(self::t('actions.reset'))
                ->icon('rotate-ccw')
                ->color('gray')
                ->button()
                ->outlined()
                ->action(function (): RedirectResponse {
                    Design::reset();

                    Notification::make()->title(self::t('notifications.reset'))->info()->send();

                    return redirect()->to(static::getUrl());
                }),
        ];
    }

    public function content(Schema $schema): Schema
    {
        return $schema->components([
            Grid::make(['default' => 1, '@lg' => 2])->schema([
                Callout::make(self::t('callouts.per_role_heading'))
                    ->description(self::t('callouts.per_role_body'))
                    ->info()
                    ->icon('users'),
                Section::make(self::t('sections.code'))->compact()->schema([
                    Html::make(new HtmlString('<pre class="overflow-x-auto rounded-md bg-muted p-3 text-xs leading-relaxed" dir="ltr"><code>'.e(self::snippet()).'</code></pre>')),
                ]),
            ]),
            Section::make(self::t('sections.notes'))->compact()->collapsible()->collapsed()->schema([
                UnorderedList::make([
                    self::t('lists.tokens'),
                    self::t('lists.renderers'),
                    self::t('lists.slots'),
                    self::t('lists.mobile'),
                ])->size('sm'),
            ]),
        ]);
    }

    private static function snippet(): string
    {
        return <<<'PHP'
$panel
    ->theme(fn (?Store $tenant) => $tenant?->theme ?? 'alfakit')
    ->design(layout: fn (?User $user) => $user?->isOwner() ? 'sidebar' : 'topbar')
    ->density(fn (?string $page) => $page === EditOrder::class ? 'compact' : 'comfortable')
    ->mobile();
PHP;
    }
}
