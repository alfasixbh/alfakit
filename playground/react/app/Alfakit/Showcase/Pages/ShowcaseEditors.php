<?php

declare(strict_types=1);

namespace App\Alfakit\Showcase\Pages;

use AlfaSix\Alfakit\Actions\Action;
use AlfaSix\Alfakit\Forms\Components\FileUpload;
use AlfaSix\Alfakit\Forms\Components\MarkdownEditor;
use AlfaSix\Alfakit\Forms\Components\RichEditor;
use AlfaSix\Alfakit\Forms\Components\RichEditor\MentionProvider;
use AlfaSix\Alfakit\Forms\Components\RichEditor\RichContentRenderer;
use AlfaSix\Alfakit\Forms\Components\RichEditor\ToolbarButtonGroup;
use AlfaSix\Alfakit\Notifications\Notification;
use AlfaSix\Alfakit\Pages\Page;
use AlfaSix\Alfakit\Schemas\Components\Section;
use AlfaSix\Alfakit\Schemas\Components\Utilities\Get;
use AlfaSix\Alfakit\Schemas\Schema;
use App\Alfakit\Showcase\Blocks\CallToActionBlock;
use App\Alfakit\Showcase\Blocks\DividerBlock;
use App\Alfakit\Showcase\Clusters\Showcase;
use Illuminate\Support\HtmlString;

/**
 * Showcase: the image editor, the rich text editor and the Markdown editor with their
 * options switched on. Nothing is persisted; "Save" validates and shows a notification,
 * "Preview" renders the rich content the way a page would show it.
 */
class ShowcaseEditors extends Page
{
    protected static ?string $cluster = Showcase::class;

    protected static ?string $navigationIcon = 'square-pen';

    protected static ?int $navigationSort = 2;

    protected static ?string $slug = 'editors';

    public static function getNavigationLabel(): string
    {
        return __('playground.showcase.editors.title');
    }

    public function mount(mixed ...$parameters): void
    {
        $this->formData = [
            'content' => '<h2>Welcome to AlfaKit</h2><p class="alfakit-lead">Select some text to see the floating toolbar, or use the toolbar above.</p>'
                .'<p>Hello <span data-type="mergeTag" data-id="name">{{ name }}</span>, your order <strong><span data-type="mergeTag" data-id="order_number">{{ order_number }}</span></strong> ships <span data-color="#2563eb" style="color: #2563eb">today</span>.</p>'
                .'<details><summary>A collapsible section</summary><div data-type="detailsContent"><p>Click the summary to fold it.</p></div></details>'
                .'<table><tbody><tr><th><p>Plan</p></th><th><p>Price</p></th></tr><tr><td><p>Starter</p></td><td><p>$9</p></td></tr><tr><td><p>Pro</p></td><td><p>$29</p></td></tr></tbody></table>',
            // Sample images (storage/app/private/showcase) so the edit button can be tried right away.
            'cover' => 'showcase/sample-cover.png',
            'avatar' => 'showcase/sample-avatar.png',
            'notes' => "## Release notes\n\n- **Bold**, _italic_ and `code`\n- [Links](https://alfakit.dev)\n\n| Feature | Status |\n| --- | --- |\n| Tables | Done |\n",
        ];
    }

    public function form(Schema $schema): Schema
    {
        return $schema->components([
            Section::make(__('playground.showcase.editors.image_editor'))
                ->description(__('playground.showcase.editors.image_editor_description'))
                ->columns(['default' => 1, 'lg' => 2])
                ->schema([
                    FileUpload::make('cover')
                        ->label(__('playground.showcase.editors.cover'))
                        ->image()
                        ->imageEditor()
                        ->imageEditorAspectRatios([null, '16:9', '4:3', '1:1'])
                        ->imageEditorMode(1)
                        ->directory('showcase'),
                    FileUpload::make('avatar')
                        ->label(__('playground.showcase.editors.avatar'))
                        ->image()
                        ->avatar()
                        ->imageEditor()
                        ->circleCropper()
                        ->directory('showcase'),
                    FileUpload::make('banner')
                        ->label(__('playground.showcase.editors.banner'))
                        ->image()
                        ->imageEditor()
                        ->imageEditorMode(0)
                        ->imageEditorAspectRatios(['21:9'])
                        ->imageEditorEmptyFillColor('#FFF4E4')
                        ->imageEditorViewportWidth(1260)
                        ->imageEditorViewportHeight(540)
                        ->directory('showcase'),
                    FileUpload::make('photo')
                        ->label(__('playground.showcase.editors.photo'))
                        ->image()
                        ->imageEditor()
                        ->imageEditorMode(3)
                        ->imageEditorAspectRatios(['3:2', '1:1'])
                        ->directory('showcase'),
                ]),
            Section::make(__('playground.showcase.editors.rich_editor'))
                ->description(__('playground.showcase.editors.rich_editor_description'))
                ->schema([
                    RichEditor::make('content')
                        ->hiddenLabel()
                        ->toolbarButtons([
                            ToolbarButtonGroup::make(__('playground.showcase.editors.headings'), ['h1', 'h2', 'h3'])->icon('heading'),
                            'bold', 'italic', 'underline', 'strike', 'textColor', 'highlight', 'subscript', 'superscript', 'code', 'small', 'link', '|',
                            ToolbarButtonGroup::make(__('playground.showcase.editors.align'), ['alignStart', 'alignCenter', 'alignEnd', 'alignJustify'])->textualButtons(),
                            'lead', 'blockquote', 'codeBlock', 'bulletList', 'orderedList', 'horizontalRule', '|',
                            'table', 'details', 'grid', 'gridDelete', '|',
                            'attachFiles', 'customBlocks', 'mergeTags', 'clearFormatting', 'undo', 'redo',
                        ])
                        ->floatingToolbars([
                            'paragraph' => ['bold', 'italic', 'underline', 'link', 'textColor'],
                            'heading' => ['alignStart', 'alignCenter', 'alignEnd'],
                            'table' => ['tableAddRowAfter', 'tableAddColumnAfter', 'tableDeleteRow', 'tableDeleteColumn', 'tableMergeCells', 'tableDelete'],
                        ])
                        ->textColors(RichEditor::getDefaultTextColors())
                        ->customTextColors()
                        ->stickyToolbar()
                        ->resizableImages()
                        ->customBlocks([
                            __('playground.showcase.editors.marketing') => [CallToActionBlock::class],
                            __('playground.showcase.editors.layout') => [DividerBlock::class],
                        ])
                        ->searchableCustomBlocks()
                        ->mergeTags(['name', 'order_number', 'today'])
                        ->mergeTagLabels(['name' => __('playground.showcase.editors.customer_name'), 'order_number' => __('playground.showcase.editors.order_number'), 'today' => __('playground.showcase.editors.today')])
                        ->mentions([
                            MentionProvider::make('@')->items(['1' => 'Alfa Admin', '2' => 'Dana Al Khalifa', '3' => 'Lina Farouk']),
                            MentionProvider::make('#')->items(['php' => 'PHP', 'laravel' => 'Laravel', 'alfakit' => 'AlfaKit']),
                        ])
                        ->fileAttachmentsDirectory('showcase')
                        ->minHeight(280)
                        ->columnSpanFull(),
                ]),
            Section::make(__('playground.showcase.editors.markdown_editor'))
                ->description(__('playground.showcase.editors.markdown_editor_description'))
                ->schema([
                    MarkdownEditor::make('notes')
                        ->hiddenLabel()
                        ->toolbarButtons([
                            'bold', 'italic', 'strike', 'link', 'code', '|',
                            'heading', 'blockquote', 'codeBlock', 'bulletList', 'orderedList', 'horizontalRule', 'table', '|',
                            'attachFiles', 'undo', 'redo',
                        ])
                        ->fileAttachmentsDirectory('showcase')
                        ->columnSpanFull(),
                ]),
        ]);
    }

    protected function getHeaderActions(): array
    {
        return [
            Action::make('preview')
                ->label(__('playground.showcase.editors.preview'))
                ->icon('eye')
                ->color('gray')
                ->modalHeading(__('playground.showcase.editors.rendered'))
                ->modalSubmitAction(false)
                ->modalWidth('3xl')
                ->modalContent(fn (): HtmlString => new HtmlString(
                    '<div class="alfakit-prose">'.RichContentRenderer::make($this->getForm()?->getState()['content'] ?? null)
                        ->customBlocks([CallToActionBlock::class, DividerBlock::class])
                        ->mergeTags(['name' => 'Dana', 'order_number' => 'AK-1042', 'today' => now()->toFormattedDateString()])
                        ->toHtml().'</div>',
                )),
        ];
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
                        ->body(__('playground.showcase.editors.saved', [
                            'images' => count(array_filter([$data['cover'] ?? null, $data['avatar'] ?? null, $data['banner'] ?? null, $data['photo'] ?? null])),
                            'rich' => mb_strlen(strip_tags((string) ($data['content'] ?? ''))),
                            'markdown' => mb_strlen((string) ($data['notes'] ?? '')),
                        ]))
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
