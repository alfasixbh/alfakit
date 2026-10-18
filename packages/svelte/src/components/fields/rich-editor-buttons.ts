import {
  detailsNodeConfigs,
  gridNodeConfigs,
  highlightMarkConfig,
  leadExtensionConfig,
  resizableImageAttributes,
  resizableImageOptions,
  smallMarkConfig,
  subscriptMarkConfig,
  superscriptMarkConfig,
  textAlignExtensionConfig,
  textColorMarkConfig,
} from '@alfakit/core'
import ALargeSmallIcon from '@lucide/svelte/icons/a-large-small'
import BaselineIcon from '@lucide/svelte/icons/baseline'
import BetweenHorizontalEndIcon from '@lucide/svelte/icons/between-horizontal-end'
import BetweenHorizontalStartIcon from '@lucide/svelte/icons/between-horizontal-start'
import BetweenVerticalEndIcon from '@lucide/svelte/icons/between-vertical-end'
import BetweenVerticalStartIcon from '@lucide/svelte/icons/between-vertical-start'
import BoldIcon from '@lucide/svelte/icons/bold'
import CodeIcon from '@lucide/svelte/icons/code'
import Columns2Icon from '@lucide/svelte/icons/columns-2'
import Columns3Icon from '@lucide/svelte/icons/columns-3'
import Grid2x2XIcon from '@lucide/svelte/icons/grid-2x2-x'
import Heading1Icon from '@lucide/svelte/icons/heading-1'
import Heading2Icon from '@lucide/svelte/icons/heading-2'
import Heading3Icon from '@lucide/svelte/icons/heading-3'
import Heading4Icon from '@lucide/svelte/icons/heading-4'
import Heading5Icon from '@lucide/svelte/icons/heading-5'
import Heading6Icon from '@lucide/svelte/icons/heading-6'
import HighlighterIcon from '@lucide/svelte/icons/highlighter'
import ImageIcon from '@lucide/svelte/icons/image'
import ItalicIcon from '@lucide/svelte/icons/italic'
import LinkIcon from '@lucide/svelte/icons/link'
import ListIcon from '@lucide/svelte/icons/list'
import ListCollapseIcon from '@lucide/svelte/icons/list-collapse'
import ListOrderedIcon from '@lucide/svelte/icons/list-ordered'
import MinusIcon from '@lucide/svelte/icons/minus'
import PanelTopIcon from '@lucide/svelte/icons/panel-top'
import PilcrowIcon from '@lucide/svelte/icons/pilcrow'
import QuoteIcon from '@lucide/svelte/icons/quote'
import RedoIcon from '@lucide/svelte/icons/redo'
import RemoveFormattingIcon from '@lucide/svelte/icons/remove-formatting'
import Rows3Icon from '@lucide/svelte/icons/rows-3'
import SquareCodeIcon from '@lucide/svelte/icons/square-code'
import SquareXIcon from '@lucide/svelte/icons/square-x'
import StrikethroughIcon from '@lucide/svelte/icons/strikethrough'
import SubscriptIcon from '@lucide/svelte/icons/subscript'
import SuperscriptIcon from '@lucide/svelte/icons/superscript'
import TableIcon from '@lucide/svelte/icons/table'
import TableCellsMergeIcon from '@lucide/svelte/icons/table-cells-merge'
import TableCellsSplitIcon from '@lucide/svelte/icons/table-cells-split'
import TablePropertiesIcon from '@lucide/svelte/icons/table-properties'
import TextAlignCenterIcon from '@lucide/svelte/icons/text-align-center'
import TextAlignEndIcon from '@lucide/svelte/icons/text-align-end'
import TextAlignJustifyIcon from '@lucide/svelte/icons/text-align-justify'
import TextAlignStartIcon from '@lucide/svelte/icons/text-align-start'
import TypeIcon from '@lucide/svelte/icons/type'
import UnderlineIcon from '@lucide/svelte/icons/underline'
import UndoIcon from '@lucide/svelte/icons/undo'
import { Extension, Mark, Node, type Extensions } from '@tiptap/core'
import Image from '@tiptap/extension-image'
import { TableKit } from '@tiptap/extension-table'
import type { LucideIconComponent } from '../../lib/icons'

// The HTML → Markdown conversion of the MarkdownEditor lives in core.
export { htmlToMarkdown } from '@alfakit/core'

type MarkConfig = Parameters<typeof Mark.create>[0]
type NodeConfig = Parameters<typeof Node.create>[0]
type ExtensionConfig = Parameters<typeof Extension.create>[0]

/** Toolbar button icons; what each button does lives in `@alfakit/core` (`TOOLBAR_COMMANDS`). */
export const TOOLBAR_ICONS: Record<string, LucideIconComponent> = {
  bold: BoldIcon,
  italic: ItalicIcon,
  underline: UnderlineIcon,
  strike: StrikethroughIcon,
  subscript: SubscriptIcon,
  superscript: SuperscriptIcon,
  code: CodeIcon,
  highlight: HighlighterIcon,
  textColor: BaselineIcon,
  link: LinkIcon,
  h1: Heading1Icon,
  h2: Heading2Icon,
  h3: Heading3Icon,
  h4: Heading4Icon,
  h5: Heading5Icon,
  h6: Heading6Icon,
  paragraph: TypeIcon,
  heading: Heading2Icon,
  alignStart: TextAlignStartIcon,
  alignCenter: TextAlignCenterIcon,
  alignEnd: TextAlignEndIcon,
  alignJustify: TextAlignJustifyIcon,
  blockquote: QuoteIcon,
  codeBlock: SquareCodeIcon,
  bulletList: ListIcon,
  orderedList: ListOrderedIcon,
  horizontalRule: MinusIcon,
  details: ListCollapseIcon,
  lead: PilcrowIcon,
  small: ALargeSmallIcon,
  grid: Columns2Icon,
  gridAddColumnBefore: BetweenVerticalStartIcon,
  gridAddColumnAfter: BetweenVerticalEndIcon,
  gridDeleteColumn: Columns3Icon,
  gridDelete: SquareXIcon,
  table: TableIcon,
  tableAddColumnBefore: BetweenVerticalStartIcon,
  tableAddColumnAfter: BetweenVerticalEndIcon,
  tableDeleteColumn: Columns3Icon,
  tableAddRowBefore: BetweenHorizontalStartIcon,
  tableAddRowAfter: BetweenHorizontalEndIcon,
  tableDeleteRow: Rows3Icon,
  tableMergeCells: TableCellsMergeIcon,
  tableSplitCell: TableCellsSplitIcon,
  tableToggleHeaderRow: PanelTopIcon,
  tableToggleHeaderCell: TablePropertiesIcon,
  tableDelete: Grid2x2XIcon,
  clearFormatting: RemoveFormattingIcon,
  attachFiles: ImageIcon,
  undo: UndoIcon,
  redo: RedoIcon,
}

/** Alignment and column icons point at a side: mirror them right to left. */
export const MIRRORED_ICONS = new Set([
  'alignStart',
  'alignEnd',
  'tableAddColumnBefore',
  'tableAddColumnAfter',
  'gridAddColumnBefore',
  'gridAddColumnAfter',
])

/** Extensions for the extra toolbar buttons (only those the toolbar uses are loaded). */
export function toolbarExtensions(buttons: string[], markdown: boolean): Extensions {
  const has = (...names: string[]) => names.some((name) => buttons.includes(name))
  const extensions: Extensions = []

  if (has('table')) extensions.push(TableKit.configure({ table: { resizable: false } }))
  // Markdown has no syntax for these.
  if (markdown) return extensions

  if (has('highlight')) extensions.push(Mark.create(highlightMarkConfig() as MarkConfig))
  if (has('subscript')) extensions.push(Mark.create(subscriptMarkConfig() as MarkConfig))
  if (has('superscript')) extensions.push(Mark.create(superscriptMarkConfig() as MarkConfig))
  if (has('textColor')) extensions.push(Mark.create(textColorMarkConfig() as MarkConfig))
  if (has('alignStart', 'alignCenter', 'alignEnd', 'alignJustify')) {
    extensions.push(Extension.create(textAlignExtensionConfig() as ExtensionConfig))
  }
  if (has('details')) {
    extensions.push(...detailsNodeConfigs().map((config) => Node.create(config as NodeConfig)))
  }
  if (has('small')) extensions.push(Mark.create(smallMarkConfig() as MarkConfig))
  if (has('lead')) extensions.push(Extension.create(leadExtensionConfig() as ExtensionConfig))
  if (has('grid', 'gridDelete', 'gridAddColumnBefore', 'gridAddColumnAfter', 'gridDeleteColumn')) {
    extensions.push(...gridNodeConfigs().map((config) => Node.create(config as NodeConfig)))
  }

  return extensions
}

/**
 * Resize handles of `resizableImages()` (Tiptap's node view adds bare `data-resize-handle`
 * elements): round dots on the corners, shown on hover and while the image is selected.
 */
export const RESIZE_HANDLE_CLASSES =
  '[&_[data-resize-handle]]:z-10 [&_[data-resize-handle]]:size-3 [&_[data-resize-handle]]:rounded-full [&_[data-resize-handle]]:border-2 [&_[data-resize-handle]]:border-background [&_[data-resize-handle]]:bg-primary [&_[data-resize-handle]]:opacity-0 [&_[data-resize-container]:hover_[data-resize-handle]]:opacity-100 [&_.ProseMirror-selectednode_[data-resize-handle]]:opacity-100 [&_[data-resize-handle=bottom-right]]:cursor-nwse-resize [&_[data-resize-handle=top-left]]:cursor-nwse-resize [&_[data-resize-handle=bottom-left]]:cursor-nesw-resize [&_[data-resize-handle=top-right]]:cursor-nesw-resize'

/** The image extension, with drag handles for `resizableImages()`. */
export function imageExtension(resizable: boolean) {
  if (!resizable) return Image

  return Image.extend({
    addAttributes() {
      return resizableImageAttributes(this.parent?.() ?? {})
    },
  }).configure(resizableImageOptions())
}
