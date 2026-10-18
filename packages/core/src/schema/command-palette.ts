import type { ActionSchema } from './actions'
import type { IconName } from './common'

/** A panel command (`Panel::commands([Command::make(…)])`): an action plus what the palette matches. */
export interface CommandSchema extends ActionSchema {
  /** Extra words the palette matches (`keywords()`). */
  keywords?: string[]
  /** The heading it is listed under (`group()`); renderers default to "Commands". */
  group?: string
  /** A second line under the label (`description()`). */
  description?: string
}

/** `alfakit.commandPalette`: the palette's extras (absent with `commandPalette(false)`). */
export interface CommandPaletteSchema {
  /** Visible commands; run with the component `commands` and the page's token. */
  commands: CommandSchema[]
  /** `recentRecords()`: the palette loads recently opened records. */
  recentRecords?: true
  placeholder?: string
}

/** A link the palette loads when it opens (`create` links and recent records). */
export interface CommandPaletteLinkSchema {
  label?: string
  title?: string
  url: string
  icon?: IconName
  /** Recent records: the resource's model label. */
  group?: string
  keywords?: string[]
}

/** Response of the `commandPalette` endpoint. */
export interface CommandPaletteResponse {
  /** "New <resource>" for the resources the user may create records in. */
  create: Array<CommandPaletteLinkSchema & { label: string }>
  /** Recently opened records the user can still view, newest first. */
  recent: Array<CommandPaletteLinkSchema & { title: string; group: string }>
}

/**
 * `alfakit.keyboardShortcuts`: `false` with `keyboardShortcuts(false)`. `overrides` are the
 * user's customised bindings by shortcut id (an empty list turns a shortcut off).
 */
export interface KeyboardShortcutsSchema {
  overrides?: Record<string, string[]>
  /** Users may change shortcuts in the overlay (stored with the `shortcuts` endpoint). */
  customizable?: true
}

/** Action endpoint component of panel commands (`Panel::COMMANDS_COMPONENT`). */
export const COMMANDS_COMPONENT = 'commands'
