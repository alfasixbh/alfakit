import { ComponentRegistry, lazyComponents } from '@alfakit/core'
import { AiCopilot, AiStream } from './components/ai'
import { AnalyticsBreakdown } from './components/analytics/breakdown'
import { CmsLivePreview } from './components/cms/live-preview-lazy'
import {
  CheckboxField,
  CodeEditorField,
  HiddenField,
  IconPickerField,
  ModalTableSelectField,
  QueryBuilderRulesField,
  RichEditorField,
  SelectField,
  TextInputField,
  ToggleField,
} from './components/fields'
import { FileManager, FileManagerPickerField } from './components/file-manager'
import { HelpdeskInbox } from './components/helpdesk'
import { Kanban } from './components/kanban'
import { ActionsComponent } from './components/layout/actions'
import { GridComponent } from './components/layout/grid'
import { SectionComponent } from './components/layout/section'
import { TranslationManager } from './components/translation-manager'
import { Tree } from './components/tree'
import { CalendarWidget } from './components/widgets/calendar-lazy'
import type { AnyComponent } from './context'
import { discoveredComponent } from './lib/discovery'

const prime = () => import('./components/layout/prime')
const elements = () => import('./components/layout/elements')
const entries = () => import('./components/entries/other-entries')

/**
 * Built-ins split per type: a page downloads only the ones its schema names (preloaded
 * before it renders, see `bootAlfakit()`), the rest load the first time they are shown.
 * The core set used on nearly every page stays in `createDefaultRegistry()` directly.
 */
export const builtInComponents = lazyComponents<AnyComponent>({
  // Fields
  MoneyInput: () => import('./components/fields/money-input').then((m) => m.MoneyInputField),
  Textarea: () => import('./components/fields/textarea').then((m) => m.TextareaField),
  OneTimeCodeInput: () =>
    import('./components/fields/one-time-code-input').then((m) => m.OneTimeCodeInputField),
  CheckboxList: () => import('./components/fields/checkbox-list').then((m) => m.CheckboxListField),
  Radio: () => import('./components/fields/radio').then((m) => m.RadioField),
  DatePicker: () => import('./components/fields/date-picker').then((m) => m.DatePickerField),
  DateTimePicker: () => import('./components/fields/date-picker').then((m) => m.DatePickerField),
  TimePicker: () => import('./components/fields/date-picker').then((m) => m.DatePickerField),
  ColorPicker: () => import('./components/fields/color-picker').then((m) => m.ColorPickerField),
  TagsInput: () => import('./components/fields/tags-input').then((m) => m.TagsInputField),
  KeyValue: () => import('./components/fields/key-value').then((m) => m.KeyValueField),
  FileUpload: () => import('./components/fields/file-upload').then((m) => m.FileUploadField),
  Repeater: () => import('./components/fields/repeater').then((m) => m.RepeaterField),
  Builder: () => import('./components/fields/builder').then((m) => m.BuilderField),
  ToggleButtons: () =>
    import('./components/fields/toggle-buttons').then((m) => m.ToggleButtonsField),
  Slider: () => import('./components/fields/slider').then((m) => m.SliderField),
  // Layout
  Fieldset: () => import('./components/layout/fieldset').then((m) => m.FieldsetComponent),
  FusedGroup: () => import('./components/layout/fused-group').then((m) => m.FusedGroupComponent),
  Tabs: () => import('./components/layout/tabs').then((m) => m.TabsComponent),
  Wizard: () => import('./components/layout/wizard').then((m) => m.WizardComponent),
  Placeholder: () => prime().then((m) => m.PlaceholderComponent),
  Html: () => prime().then((m) => m.HtmlComponent),
  Text: () => prime().then((m) => m.TextComponent),
  View: () => prime().then((m) => m.ViewComponent),
  Flex: () => elements().then((m) => m.FlexComponent),
  Callout: () => elements().then((m) => m.CalloutComponent),
  EmptyState: () => elements().then((m) => m.EmptyStateComponent),
  Icon: () => elements().then((m) => m.IconComponent),
  Image: () => elements().then((m) => m.ImageComponent),
  UnorderedList: () => elements().then((m) => m.UnorderedListComponent),
  // `HistoryAction`'s version list (`HasRecordVersions`).
  RecordVersions: () =>
    import('./components/versions/record-versions').then((m) => m.RecordVersionsComponent),
  // Infolist entries
  TextEntry: () => import('./components/entries/text-entry').then((m) => m.TextEntryComponent),
  IconEntry: () => entries().then((m) => m.IconEntryComponent),
  ImageEntry: () => entries().then((m) => m.ImageEntryComponent),
  CodeEntry: () => import('./components/entries/code-entry').then((m) => m.CodeEntryComponent),
  ColorEntry: () => entries().then((m) => m.ColorEntryComponent),
  KeyValueEntry: () => entries().then((m) => m.KeyValueEntryComponent),
  RepeatableEntry: () => entries().then((m) => m.RepeatableEntryComponent),
  ViewEntry: () => import('./components/entries/view-entry').then((m) => m.ViewEntryComponent),
})

/** Built-in renderers for every schema `type` the PHP side emits. */
export function createDefaultRegistry(): ComponentRegistry<AnyComponent> {
  return new ComponentRegistry<AnyComponent>({
    ...builtInComponents.map(discoveredComponent).components,
    // Core set: on nearly every page, so in the main chunk.
    TextInput: TextInputField,
    Hidden: HiddenField,
    Checkbox: CheckboxField,
    Toggle: ToggleField,
    Select: SelectField,
    RichEditor: RichEditorField,
    MarkdownEditor: RichEditorField,
    CodeEditor: CodeEditorField,
    ModalTableSelect: ModalTableSelectField,
    IconPicker: IconPickerField,
    // Table filters
    QueryBuilderRules: QueryBuilderRulesField,
    // Layout
    Grid: GridComponent,
    Group: GridComponent,
    Section: SectionComponent,
    Tab: GridComponent,
    Step: GridComponent,
    Actions: ActionsComponent,
    // First-party plugins (alfasix/alfakit-calendar, alfasix/alfakit-tree), lazy-loaded
    'widget:calendar': CalendarWidget,
    tree: Tree,
    // alfasix/alfakit-translation-manager, lazy-loaded
    'translation-manager': TranslationManager,
    // alfasix/alfakit-kanban: the page component and the widget share the key.
    kanban: Kanban,
    // alfasix/alfakit-file-manager: the page component (lazy-loaded) and the picker field.
    'file-manager': FileManager,
    FileManagerPicker: FileManagerPickerField,
    // alfasix/alfakit-ai: the topbar copilot (its chat loads on first open).
    'ai:copilot': AiCopilot,
    // alfasix/alfakit-ai `streaming()`: answers streamed into modal forms (lazy-loaded).
    'ai:stream': AiStream,
    // alfasix/alfakit-analytics: the dashboard's top lists.
    'analytics:breakdown': AnalyticsBreakdown,
    // alfasix/alfakit-cms: the page editor's autosave and live preview.
    CmsLivePreview,
    // alfasix/alfakit-helpdesk: the agent inbox page component, lazy-loaded.
    'helpdesk:inbox': HelpdeskInbox,
  })
}
