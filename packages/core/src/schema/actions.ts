import type {
  ActionVariant,
  Alignment,
  Attributes,
  Color,
  IconName,
  IconPosition,
  RecordKey,
  Size,
  Width,
} from './common'
import type { SchemaComponent } from './components'
import type { FormPayload } from './form'
import type { NotificationSchema } from './notifications'

/** A button descriptor. The modal (if any) is fetched lazily from the modal endpoint. */
export interface ActionSchema {
  type: 'Action' | 'BulkAction'
  name: string
  label?: string | null
  icon?: IconName
  iconPosition?: IconPosition
  color?: Color
  /** `'badge'`: `badge()` without an argument, the trigger rendered as a badge. */
  variant?: ActionVariant | 'badge'
  outlined?: boolean
  size?: Size
  badge?: string | number
  badgeColor?: Color
  tooltip?: string
  disabled?: boolean
  url?: string
  openUrlInNewTab?: boolean
  /** `postToUrl()`: clicking sends a POST request to `url` instead of visiting it. */
  postToUrl?: boolean
  /** True when clicking opens a modal (confirmation and/or form) before executing. */
  hasModal?: boolean
  /** True when the action runs server-side logic (vs. a plain link). */
  hasAction?: boolean
  keyBindings?: string[]
  record?: RecordKey
  /**
   * `Action::formId()`: the page form (`form`, `form:{name}`) this button submits. The
   * runner sends that form's state as the action's data, wherever the button is.
   */
  formId?: string
  extraAttributes?: Attributes
  /**
   * A record action that receives the table's selection (`accessSelectedRecords()`): the
   * renderer sends the selected keys with it (`selectedRecordsArguments()`).
   */
  accessSelectedRecords?: boolean
  /**
   * `labeledFrom('md')`: icon only below this breakpoint, label from it up (the label
   * stays the accessible name).
   */
  labeledFrom?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  /**
   * `makeModalSubmitAction()`: the button submits the modal it sits in, running the
   * parent action with `arguments`.
   */
  submitsModal?: boolean
  arguments?: Record<string, unknown>
  /** `openDatabaseNotifications()`: clicking opens the database notifications panel. */
  opensDatabaseNotifications?: boolean
}

export interface ActionGroupSchema {
  type: 'ActionGroup'
  label?: string
  icon?: IconName
  color?: Color
  variant?: ActionVariant
  size?: Size
  tooltip?: string
  dropdownPlacement?: string
  /**
   * `dropdown(false)`: a nested group is a divided section of its parent dropdown; a
   * top-level group renders its actions inline.
   */
  dropdown?: boolean
  /** `buttonGroup()`: the actions render as joined buttons. */
  buttonGroup?: boolean
  /** `dropdownWidth()`: `xs` … `7xl`. */
  dropdownWidth?: Width
  /** `dropdownOffset()`: pixels between the trigger and the dropdown. */
  dropdownOffset?: number
  /** `maxHeight()`: a CSS length; the dropdown scrolls beyond it. */
  maxHeight?: string
  actions: Array<ActionSchema | ActionGroupSchema>
}

export type AnyActionSchema = ActionSchema | ActionGroupSchema

export function isActionGroup(action: AnyActionSchema): action is ActionGroupSchema {
  return action.type === 'ActionGroup'
}

/** Response of the modal endpoint. */
export interface ActionModalSchema {
  name: string
  heading?: string
  description?: string
  icon?: IconName
  iconColor?: Color
  width: Width
  slideOver?: boolean
  /** `slideOverPosition(SlideOverPosition::Start)`: the slide-over enters from the start side. */
  slideOverPosition?: 'start' | 'end'
  alignment?: Alignment
  /** `modalFooterActionsAlignment()`: footer buttons only (`alignment` moves the heading too). */
  footerActionsAlignment?: Alignment
  /** `stickyModalHeader()`: the heading stays visible while the content scrolls. */
  stickyHeader?: boolean
  stickyFooter?: boolean
  /** `modalClickThrough()`: no backdrop; the page underneath stays usable. */
  clickThrough?: boolean
  /** `extraModalWindowAttributes()` */
  windowAttributes?: Attributes
  /** `extraModalOverlayAttributes()` */
  overlayAttributes?: Attributes
  /**
   * `cancelParentActionsOnClose()`: closing this nested modal closes its parents too
   * (`true`), or the parents up to and including the named one.
   */
  cancelParentActionsOnClose?: true | string
  /**
   * `overlayParentActions()`: this nested modal opens on top of its parent, which stays
   * visible. Without it the parent modal is hidden while this one is open (Filament's
   * default).
   */
  overlayParent?: boolean
  autofocus: boolean
  closeByClickingAway: boolean
  closeByEscaping: boolean
  closeButton: boolean
  submitLabel?: string
  cancelLabel?: string
  submitColor?: Color
  /** Icon of the submit button (`modalSubmitAction(fn (Action $a) => $a->icon(…))`). */
  submitIcon?: IconName
  /** Colour of the cancel button (`modalCancelAction(fn (Action $a) => $a->color(…))`). */
  cancelColor?: Color
  /**
   * Ask before closing the modal (and before leaving the page) while its form has unsaved
   * changes: `unsavedChangesAlert()` or the panel's `unsavedChangesAlerts()`.
   */
  unsavedChangesAlert?: boolean
  requiresConfirmation?: boolean
  /** The form is a wizard (`->steps()`): the submit button shows on the last step only. */
  wizard?: boolean
  /** Ask for the current password (`requiresPasswordConfirmation()`, not confirmed recently). */
  passwordConfirmation?: boolean
  content?: SchemaComponent[]
  contentFooter?: SchemaComponent[]
  form?: FormPayload
  /** Footer buttons; they run as nested actions of this one (and may open their own modal). */
  extraFooterActions?: AnyActionSchema[]
  /**
   * `CreateAction`: label of the "Create & create another" button (absent with
   * `createAnother(false)`). It runs the action with the `another` argument; the modal
   * then stays open with a fresh form.
   */
  createAnotherLabel?: string
  /** `createAnotherAction()`: colour of the "Create & create another" button (outline). */
  createAnotherColor?: Color
  /** `createAnotherAction()`: icon of the "Create & create another" button. */
  createAnotherIcon?: IconName
  /**
   * `preserveFormDataWhenCreatingAnother()`: `true` keeps every top-level field after
   * "Create & create another", a list keeps the named fields only.
   */
  preserveFormData?: boolean | string[]
  record?: RecordKey
}

/**
 * Response of the modal endpoint when `mountUsing()` halted or cancelled the action: the
 * modal doesn't open; the notifications it sent are shown.
 */
export interface ActionModalCancelledResponse {
  cancelled: true
  notifications?: NotificationSchema[]
}

/** Flashed by the action endpoint after a run. */
export interface ActionResultFlash {
  name: string
  status: 'success' | 'halted' | 'cancelled'
  closeModal?: boolean
  deselectRecords?: boolean | null
  /**
   * A nested action asked to close the modals it was opened from (`cancelParentActions()`):
   * all of them (`true`), or those up to and including the named parent.
   */
  cancelParentActions?: boolean | string | null
  /** `fillData()`: values a nested action wrote into its parents' forms, per parent name. */
  parentData?: Array<{ name: string; data: Record<string, unknown> }>
  /** `replaceMountedAction()`: the action that opens (or runs) in place of this one. */
  replaceMountedAction?: {
    name: string
    arguments?: Record<string, unknown> | null
    hasModal: boolean
  }
}
