<?php

declare(strict_types=1);

namespace App\Alfakit\Pages\Showcase;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Schemas\Components\Callout;
use AlfaSix\Alfakit\Schemas\Components\Grid;
use AlfaSix\Alfakit\Schemas\Components\Html;
use AlfaSix\Alfakit\Schemas\Components\Section;
use AlfaSix\Alfakit\Schemas\Components\Text;
use AlfaSix\Alfakit\Schemas\Components\UnorderedList;
use AlfaSix\Alfakit\Schemas\Schema;
use Illuminate\Support\HtmlString;

/**
 * Showcase: how coding agents work with AlfaKit through Laravel Boost guidelines and skills.
 */
class ShowcaseAiAgents extends ShowcasePage
{
    protected static string $key = 'ai';

    protected static ?string $navigationIcon = 'bot';

    protected static ?int $navigationSort = 8;

    /** The website's AI agents page, from `demo.site_url`. */
    public static function aiUrl(): string
    {
        return config('demo.site_url').'/ai';
    }

    protected function getHeaderActions(): array
    {
        return [
            Action::make('ai_docs')
                ->label(self::t('actions.open'))
                ->icon('external-link')
                ->button()
                ->url(self::aiUrl(), shouldOpenInNewTab: true),
        ];
    }

    public function content(Schema $schema): Schema
    {
        return $schema->components([
            Callout::make(self::t('callouts.heading'))
                ->description(self::t('callouts.body'))
                ->info()
                ->icon('bot')
                ->actions([
                    Action::make('ai_link')->label(self::t('actions.open'))->icon('external-link')->link()->url(self::aiUrl(), shouldOpenInNewTab: true),
                ]),
            Grid::make(['default' => 1, '@lg' => 2])->schema([
                Section::make(self::t('sections.skills'))
                    ->description(self::t('sections.skills_help'))
                    ->icon('graduation-cap')
                    ->schema([
                        UnorderedList::make([
                            self::t('skills.development'),
                            self::t('skills.design'),
                            self::t('skills.frontend'),
                            self::t('skills.standalone'),
                            self::t('skills.localization'),
                        ])->size('sm'),
                    ]),
                Section::make(self::t('sections.prompt'))
                    ->description(self::t('sections.prompt_help'))
                    ->icon('terminal')
                    ->schema([
                        Html::make(new HtmlString('<pre class="overflow-x-auto rounded-md bg-muted p-3 text-xs leading-relaxed" dir="ltr"><code>'.e(self::prompt()).'</code></pre>')),
                        Text::make(self::t('texts.prompt_note'))->size('sm')->color('gray'),
                    ]),
            ]),
            Section::make(self::t('sections.workflow'))
                ->compact()
                ->icon('route')
                ->schema([
                    UnorderedList::make([
                        self::t('workflow.install'),
                        self::t('workflow.generate'),
                        self::t('workflow.test'),
                        self::t('workflow.migrate'),
                    ])->size('sm'),
                ]),
        ]);
    }

    private static function prompt(): string
    {
        return <<<'TXT'
composer require alfasix/alfakit laravel/boost --dev
php artisan boost:install

# then, in your agent:
"Create a Product resource with a table grouped by brand, a price summary
 and an import action; keep every label translatable."
TXT;
    }
}
