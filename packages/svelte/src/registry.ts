import { ComponentRegistry, lazyComponents } from '@alfakit/core'
import { AiCopilot, AiStream } from './components/ai'
import { AnalyticsBreakdown } from './components/analytics'
import CmsLivePreview from './components/cms/LivePreviewLazy.svelte'
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
import ActionsComponent from './components/layout/ActionsComponent.svelte'
import GridComponent from './components/layout/GridComponent.svelte'
import SectionComponent from './components/layout/SectionComponent.svelte'
import { TranslationManager } from './components/translation-manager'
import { Tree } from './components/tree'
import CalendarWidget from './components/widgets/CalendarLazy.svelte'
import type { AnyComponent } from './context.svelte'
import { discoveredComponent } from './lib/discovery'

/**
 * Built-ins split per type: a page downloads only the ones its schema names (preloaded
 * before it renders, see `createAlfakit()`), the rest load the first time they are shown.
 * The core set used on nearly every page stays in `createDefaultRegistry()` directly.
 */
export const builtInComponents = lazyComponents<AnyComponent>({
  // Fields
  MoneyInput: () => import('./components/fields/MoneyInputField.svelte').then((m) => m.default),
  Textarea: () => import('./components/fields/TextareaField.svelte').then((m) => m.default),
  OneTimeCodeInput: () =>
    import('./components/fields/OneTimeCodeInputField.svelte').then((m) => m.default),
  CheckboxList: () => import('./components/fields/CheckboxListField.svelte').then((m) => m.default),
  Radio: () => import('./components/fields/RadioField.svelte').then((m) => m.default),
  DatePicker: () => import('./components/fields/DatePickerField.svelte').then((m) => m.default),
  DateTimePicker: () => import('./components/fields/DatePickerField.svelte').then((m) => m.default),
  TimePicker: () => import('./components/fields/DatePickerField.svelte').then((m) => m.default),
  ColorPicker: () => import('./components/fields/ColorPickerField.svelte').then((m) => m.default),
  TagsInput: () => import('./components/fields/TagsInputField.svelte').then((m) => m.default),
  KeyValue: () => import('./components/fields/KeyValueField.svelte').then((m) => m.default),
  FileUpload: () => import('./components/fields/FileUploadField.svelte').then((m) => m.default),
  Repeater: () => import('./components/fields/RepeaterField.svelte').then((m) => m.default),
  Builder: () => import('./components/fields/BuilderField.svelte').then((m) => m.default),
  ToggleButtons: () =>
    import('./components/fields/ToggleButtonsField.svelte').then((m) => m.default),
  Slider: () => import('./components/fields/SliderField.svelte').then((m) => m.default),
  // Layout
  Fieldset: () => import('./components/layout/FieldsetComponent.svelte').then((m) => m.default),
  FusedGroup: () => import('./components/layout/FusedGroupComponent.svelte').then((m) => m.default),
  Tabs: () => import('./components/layout/TabsComponent.svelte').then((m) => m.default),
  Wizard: () => import('./components/layout/WizardComponent.svelte').then((m) => m.default),
  Placeholder: () =>
    import('./components/layout/PlaceholderComponent.svelte').then((m) => m.default),
  Html: () => import('./components/layout/HtmlComponent.svelte').then((m) => m.default),
  Text: () => import('./components/layout/TextComponent.svelte').then((m) => m.default),
  View: () => import('./components/layout/ViewComponent.svelte').then((m) => m.default),
  Flex: () => import('./components/layout/FlexComponent.svelte').then((m) => m.default),
  Callout: () => import('./components/layout/CalloutComponent.svelte').then((m) => m.default),
  EmptyState: () => import('./components/layout/EmptyStateComponent.svelte').then((m) => m.default),
  Icon: () => import('./components/layout/IconComponent.svelte').then((m) => m.default),
  Image: () => import('./components/layout/ImageComponent.svelte').then((m) => m.default),
  UnorderedList: () =>
    import('./components/layout/UnorderedListComponent.svelte').then((m) => m.default),
  // `HistoryAction`'s version list (`HasRecordVersions`).
  RecordVersions: () =>
    import('./components/versions/RecordVersionsComponent.svelte').then((m) => m.default),
  // Infolist entries
  TextEntry: () => import('./components/entries/TextEntryComponent.svelte').then((m) => m.default),
  IconEntry: () => import('./components/entries/IconEntryComponent.svelte').then((m) => m.default),
  ImageEntry: () =>
    import('./components/entries/ImageEntryComponent.svelte').then((m) => m.default),
  CodeEntry: () => import('./components/entries/CodeEntryComponent.svelte').then((m) => m.default),
  ColorEntry: () =>
    import('./components/entries/ColorEntryComponent.svelte').then((m) => m.default),
  KeyValueEntry: () =>
    import('./components/entries/KeyValueEntryComponent.svelte').then((m) => m.default),
  RepeatableEntry: () =>
    import('./components/entries/RepeatableEntryComponent.svelte').then((m) => m.default),
  ViewEntry: () => import('./components/entries/ViewEntryComponent.svelte').then((m) => m.default),
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
