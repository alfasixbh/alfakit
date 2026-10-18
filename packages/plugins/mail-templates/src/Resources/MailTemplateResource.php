<?php

declare(strict_types=1);

namespace AlfaSix\AlfakitMailTemplates\Resources;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Actions\ActionGroup;
use AlfaSix\Alfakit\Actions\DeleteAction;
use AlfaSix\Alfakit\Actions\EditAction;
use AlfaSix\Alfakit\Forms\Components\RichEditor;
use AlfaSix\Alfakit\Forms\Components\Select;
use AlfaSix\Alfakit\Forms\Components\TextInput;
use AlfaSix\Alfakit\Mail\EditableTemplates;
use AlfaSix\Alfakit\Mail\MailDefinition;
use AlfaSix\Alfakit\Mail\Mails;
use AlfaSix\Alfakit\Mail\MailTheme;
use AlfaSix\Alfakit\Mail\RenderedMailTemplate;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Resources\Resource;
use AlfaSix\Alfakit\Schemas\Components\Grid;
use AlfaSix\Alfakit\Schemas\Components\Html;
use AlfaSix\Alfakit\Schemas\Components\Section;
use AlfaSix\Alfakit\Schemas\Components\Utilities\Get;
use AlfaSix\Alfakit\Schemas\Components\Utilities\Set;
use AlfaSix\Alfakit\Schemas\Schema;
use AlfaSix\Alfakit\Support\Credit;
use AlfaSix\Alfakit\Tables\Columns\TextColumn;
use AlfaSix\Alfakit\Tables\Filters\SelectFilter;
use AlfaSix\Alfakit\Tables\Table;
use AlfaSix\AlfakitMailTemplates\Mail\TestTemplateMail;
use AlfaSix\AlfakitMailTemplates\MailTemplatesPlugin;
use AlfaSix\AlfakitMailTemplates\Models\MailTemplate;
use AlfaSix\AlfakitMailTemplates\Resources\MailTemplateResource\Pages;
use AlfaSix\AlfakitMailTemplates\Rules\KnownMergeTags;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\HtmlString;
use Illuminate\Validation\Rules\Unique;
use Throwable;

/**
 * Mail templates: one row per edited mail and locale. The form offers the mail's merge
 * tags in the editor; saving rejects unknown tags and sanitises the body. Preview renders
 * it with sample data (light and dark), "Send test" mails it to the signed-in admin only,
 * "Reset to default" returns the mail to its own content and History lists the versions.
 */
class MailTemplateResource extends Resource
{
    protected static ?string $slug = 'mail-templates';

    protected static ?string $recordTitleAttribute = 'key';

    protected static bool $isScopedToTenant = false;

    protected static bool $isGloballySearchable = false;

    protected static bool $isDiscovered = false;

    public static function getModel(): string
    {
        return MailTemplate::class;
    }

    public static function getPlugin(): MailTemplatesPlugin
    {
        return MailTemplatesPlugin::get();
    }

    public static function trans(string $key, array $replace = []): string
    {
        return (string) __('alfakit-mail-templates::mail-templates.'.$key, $replace);
    }

    public static function getModelLabel(): string
    {
        return static::trans('label');
    }

    public static function getPluralModelLabel(): string
    {
        return static::trans('plural_label');
    }

    public static function getNavigationLabel(): string
    {
        return static::trans('navigation');
    }

    public static function getNavigationGroup(): ?string
    {
        return static::getPlugin()->getNavigationGroup();
    }

    public static function getNavigationSort(): ?int
    {
        return static::getPlugin()->getNavigationSort();
    }

    public static function getNavigationIcon(): ?string
    {
        return static::getPlugin()->getNavigationIcon();
    }

    public static function getRecordTitle(?Model $record): string
    {
        return $record instanceof MailTemplate ? static::templateLabel($record->key).' · '.$record->locale : static::getModelLabel();
    }

    public static function hasVersions(): bool
    {
        return MailTemplate::hasVersionsTable();
    }

    public static function can(string $action, ?Model $record = null): bool
    {
        if (! static::getPlugin()->isAuthorized()) {
            return false;
        }

        return Gate::getPolicyFor(static::getModel()) === null ? true : parent::can($action, $record);
    }

    // ---------------------------------------------------------------- Form

    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            Section::make(static::trans('sections.template'))
                ->description(static::trans('sections.template_description'))
                ->columns(2)
                ->schema([
                    Select::make('key')
                        ->label(static::trans('fields.key'))
                        ->options(static fn (): array => static::templateOptions())
                        ->searchable()
                        ->required()
                        ->in(static fn (): array => array_keys(Mails::editable()))
                        ->unique(modifyRuleUsing: static fn (Unique $rule, Get $get): Unique => $rule->where('locale', $get('locale')))
                        ->validationMessages(['unique' => static::trans('validation.unique')])
                        ->disabledOn('edit')
                        ->live()
                        ->afterStateUpdated(static fn (Get $get, Set $set) => static::fillDefaults($get, $set)),
                    Select::make('locale')
                        ->label(static fn (): string => static::trans('fields.locale'))
                        ->options(static fn (): array => static::getPlugin()->getLocales())
                        ->default(static fn (): string => app()->getLocale())
                        ->required()
                        ->in(static fn (): array => array_keys(static::getPlugin()->getLocales()))
                        ->disabledOn('edit')
                        ->live()
                        ->afterStateUpdated(static fn (Get $get, Set $set) => static::fillDefaults($get, $set)),
                ]),

            Section::make(static::trans('sections.content'))
                ->description(static::trans('sections.content_description'))
                ->schema([
                    TextInput::make('subject')
                        ->label(static::trans('fields.subject'))
                        ->helperText(static::trans('fields.subject_help'))
                        ->maxLength(255)
                        ->rules(static fn (Get $get): array => [new KnownMergeTags(is_string($key = $get('key')) ? $key : null)]),
                    RichEditor::make('body')
                        ->label(static::trans('fields.body'))
                        ->helperText(static::trans('fields.body_help'))
                        ->toolbarButtons(['bold', 'italic', 'underline', 'link', '|', 'h2', 'h3', 'blockquote', '|', 'bulletList', 'orderedList', '|', 'undo', 'redo'])
                        ->mergeTags(static fn (Get $get): array => static::definitionFor($get('key'))?->getMergeTags() ?? [])
                        ->rules(static fn (Get $get): array => [new KnownMergeTags(is_string($key = $get('key')) ? $key : null, isBody: true)]),
                    Html::make(static fn (Get $get): HtmlString => static::mergeTagList(static::definitionFor($get('key')))),
                ]),
        ]);
    }

    /**
     * Start a new template from the mail's own subject and body, in the chosen locale.
     */
    public static function fillDefaults(Get $get, Set $set): void
    {
        $definition = static::definitionFor($get('key'));

        if ($definition === null) {
            return;
        }

        $locale = is_string($locale = $get('locale')) && $locale !== '' ? $locale : app()->getLocale();

        MailTheme::withLocale($locale, static function () use ($definition, $set): void {
            $set('subject', $definition->getDefaultSubject());
            $set('body', $definition->getDefaultBody());
        });
    }

    /**
     * The editable mails, `key => "Group · Label"`.
     *
     * @return array<string, string>
     */
    public static function templateOptions(): array
    {
        $options = [];

        foreach (Mails::editable() as $key => $definition) {
            $group = $definition->getGroup();
            $options[$key] = ($group === null ? '' : $group.' · ').$definition->getLabel();
        }

        asort($options);

        return $options;
    }

    public static function definitionFor(mixed $key): ?MailDefinition
    {
        $definition = is_string($key) ? Mails::get($key) : null;

        return $definition?->isEditable() ? $definition : null;
    }

    public static function templateLabel(string $key): string
    {
        return Mails::get($key)?->getLabel() ?? $key;
    }

    protected static function mergeTagList(?MailDefinition $definition): HtmlString
    {
        if ($definition === null) {
            return new HtmlString('');
        }

        $items = '';

        foreach ($definition->getMergeTags() as $id => $label) {
            $items .= '<li><code dir="ltr">'.e('{{ '.$id.' }}').'</code> '.e($label).'</li>';
        }

        return new HtmlString('<p class="text-muted-foreground text-sm">'.e(static::trans('fields.merge_tags')).'</p><ul class="text-sm">'.$items.'</ul>');
    }

    // ---------------------------------------------------------------- Table

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('key')
                    ->label(static::trans('fields.key'))
                    ->formatStateUsing(static fn (string $state): string => static::templateLabel($state))
                    ->description(static fn (MailTemplate $record): ?string => $record->definition()?->getGroup())
                    ->weight('medium')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('locale')
                    ->label(static::trans('fields.locale'))
                    ->badge()
                    ->color('gray')
                    ->sortable(),
                TextColumn::make('status')
                    ->label(static::trans('fields.status'))
                    ->getStateUsing(static fn (MailTemplate $record): string => $record->isCustomized() ? 'customized' : 'default')
                    ->formatStateUsing(static fn (string $state): string => static::trans('statuses.'.$state))
                    ->badge()
                    ->color(static fn (string $state): string => $state === 'customized' ? 'success' : 'gray'),
                TextColumn::make('subject')
                    ->label(static::trans('fields.subject'))
                    ->placeholder(static::trans('statuses.default'))
                    ->limit(60)
                    ->toggleable(),
                TextColumn::make('updated_at')
                    ->label(static::trans('fields.updated_at'))
                    ->since()
                    ->sortable(),
            ])
            ->filters([
                SelectFilter::make('locale')
                    ->label(static::trans('fields.locale'))
                    ->options(static fn (): array => static::getPlugin()->getLocales()),
            ])
            ->recordActions([
                static::previewAction(),
                ActionGroup::make([
                    EditAction::make(),
                    static::sendTestAction(),
                    static::resetAction(),
                    DeleteAction::make(),
                ]),
            ])
            ->defaultSort('key')
            ->emptyStateIcon('mail')
            ->emptyStateHeading(static::trans('empty.heading'))
            ->emptyStateDescription(static::trans('empty.description'));
    }

    // ---------------------------------------------------------------- Actions

    /**
     * The saved template with sample data, light and dark, in its locale.
     */
    public static function previewAction(): Action
    {
        return Action::make('preview')
            ->label(static::trans('actions.preview.label'))
            ->icon('eye')
            ->color('gray')
            ->slideOver()
            ->modalWidth('5xl')
            ->modalHeading(static fn (MailTemplate $record): string => static::getRecordTitle($record))
            ->modalSubmitAction(false)
            ->modalCancelActionLabel(static::trans('actions.preview.close'))
            ->authorize(static fn (MailTemplate $record): bool => static::can('view', $record))
            ->modalContent(static function (MailTemplate $record): array {
                try {
                    $light = static::render($record);
                    $dark = MailTheme::withDarkMode(static fn (): RenderedMailTemplate => static::render($record));
                } catch (Throwable $exception) {
                    report($exception);

                    return [Html::make(new HtmlString('<p role="alert">'.e(static::trans('actions.preview.error')).'</p>'))];
                }

                return [
                    Html::make(new HtmlString('<p class="text-sm"><span class="font-medium">'.e(static::trans('actions.preview.subject')).'</span> <span dir="auto">'.e($light->subject).'</span></p>')),
                    Grid::make(['default' => 1, 'lg' => 2])->schema([
                        Html::make(static::frame($light, static::trans('actions.preview.light'))),
                        Html::make(static::frame($dark, static::trans('actions.preview.dark'))),
                    ]),
                ];
            });
    }

    /**
     * Mail the template, with sample data, to the signed-in admin (and nobody else).
     */
    public static function sendTestAction(): Action
    {
        return Action::make('sendTest')
            ->label(static::trans('actions.send_test.label'))
            ->icon('send')
            ->requiresConfirmation()
            ->modalIcon('send')
            ->modalHeading(static::trans('actions.send_test.modal_heading'))
            ->modalDescription(static fn (): string => static::trans('actions.send_test.modal_description', ['email' => static::currentUserEmail() ?? '—']))
            ->modalSubmitActionLabel(static::trans('actions.send_test.submit'))
            ->authorize(static fn (MailTemplate $record): bool => static::can('view', $record))
            ->action(static function (MailTemplate $record): void {
                $email = static::currentUserEmail();

                if ($email === null) {
                    Notification::make()->danger()->title(static::trans('actions.send_test.no_email'))->send();

                    return;
                }

                Mail::to($email)->send(new TestTemplateMail(static::render($record)));

                Notification::make()->success()->title(static::trans('actions.send_test.sent', ['email' => $email]))->send();
            });
    }

    /**
     * Back to the mail's own subject and body; History keeps the edited versions.
     */
    public static function resetAction(): Action
    {
        return Action::make('reset')
            ->label(static::trans('actions.reset.label'))
            ->icon('rotate-ccw')
            ->color('danger')
            ->requiresConfirmation()
            ->modalHeading(static::trans('actions.reset.modal_heading'))
            ->modalDescription(static::trans('actions.reset.modal_description'))
            ->modalSubmitActionLabel(static::trans('actions.reset.submit'))
            ->visible(static fn (MailTemplate $record): bool => $record->isCustomized())
            ->authorize(static fn (MailTemplate $record): bool => static::can('update', $record))
            ->action(static function (MailTemplate $record): void {
                $record->resetToDefault();

                Notification::make()->success()->title(static::trans('actions.reset.done'))->send();
            });
    }

    /**
     * The template as it would be sent in its locale, with the mail's sample data: the
     * edited subject and body, or the mail's own content once reset.
     */
    public static function render(MailTemplate $record): RenderedMailTemplate
    {
        $definition = $record->definition();

        return MailTheme::withLocale($record->locale, static function () use ($record, $definition): RenderedMailTemplate {
            if ($definition === null) {
                return EditableTemplates::render($record->key, $record->subject ?? $record->key, (string) $record->body, [], Credit::emailLine(), $record->locale);
            }

            if ($record->body === null) {
                $default = $definition->render();
                $html = $default['html'];

                return new RenderedMailTemplate(
                    key: $record->key,
                    locale: $record->locale,
                    subject: $record->subject !== null ? EditableTemplates::renderSubject($record->subject, $definition->getSampleData()) : $default['subject'],
                    html: $html,
                    text: EditableTemplates::toText($html->toHtml()),
                );
            }

            return EditableTemplates::render(
                $record->key,
                $record->subject ?? $definition->getDefaultSubject(),
                $record->body,
                $definition->getSampleData(),
                Credit::emailLine(),
                $record->locale,
            );
        });
    }

    protected static function frame(RenderedMailTemplate $template, string $label): HtmlString
    {
        return new HtmlString(
            '<p class="text-muted-foreground mb-2 text-sm">'.e($label).'</p>'
            .'<iframe sandbox="" referrerpolicy="no-referrer" title="'.e(static::trans('actions.preview.frame', ['variant' => $label])).'" srcdoc="'.e($template->html->toHtml()).'" '
            .'style="width:100%;height:640px;border:0;border-radius:0.5rem;background:#fff"></iframe>',
        );
    }

    protected static function currentUserEmail(): ?string
    {
        $user = static::getPlugin()->getUser();
        $email = $user instanceof Model ? $user->getAttribute('email') : null;

        return is_string($email) && filter_var($email, FILTER_VALIDATE_EMAIL) !== false ? $email : null;
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListMailTemplates::route('/'),
            'create' => Pages\CreateMailTemplate::route('/create'),
            'edit' => Pages\EditMailTemplate::route('/{record}/edit'),
        ];
    }
}
