import type { BaseField } from './components'
import type { NotificationSchema } from './notifications'

/** What a file is, for icons and previews (alfasix/alfakit-file-manager). */
export type FileManagerKind =
  | 'folder'
  | 'image'
  | 'video'
  | 'audio'
  | 'pdf'
  | 'text'
  | 'archive'
  | 'document'
  | 'spreadsheet'
  | 'presentation'
  | 'other'

/** A file or folder, addressed by its path under the manager's root (never the disk's). */
export interface FileManagerEntrySchema {
  /** Path relative to the root (`reports/q1.pdf`); in the trash, the item's trash id. */
  path: string
  name: string
  type: 'file' | 'folder'
  size?: number | null
  /** Guessed from the name in listings; detected from the contents in details. */
  mime?: string | null
  extension?: string | null
  kind: FileManagerKind
  /** ISO 8601. */
  modified?: string | null
  /** A signed URL of the image itself (images the browser draws, up to 15 MB). */
  thumbnail?: string | null
  /** Picker mode: the path on the disk the picker stores. */
  value?: string | null
  /** Picker mode: whether the entry may be chosen (accepted type, a file). */
  selectable?: boolean
  /** Items in the trash. */
  trashed?: { originalPath: string; deletedAt: string | null }
}

/** A folder of the folder tree. */
export interface FileManagerFolderSchema {
  path: string
  name: string
  hasChildren: boolean
}

export interface FileManagerBreadcrumbSchema {
  path: string
  name: string
}

/** The entries of one folder (or of the trash). */
export interface FileManagerListingSchema {
  disk: string
  path: string
  /** The trash is shown instead of a folder. */
  trash?: boolean
  /** Days after which trashed items are deleted for good. */
  retentionDays?: number | null
  breadcrumbs: FileManagerBreadcrumbSchema[]
  entries: FileManagerEntrySchema[]
  /** The folder has more entries than the server lists. */
  truncated?: boolean
}

/** What the current user may do (checked again by the server for every operation). */
export interface FileManagerPermissionsSchema {
  upload: boolean
  createFolder: boolean
  rename: boolean
  move: boolean
  copy: boolean
  delete: boolean
  restore: boolean
  download: boolean
  share: boolean
  zip: boolean
}

/** The names of the component's JSON actions. */
export interface FileManagerActionNames {
  list: string
  tree: string
  search: string
  createFolder: string
  rename: string
  move: string
  copy: string
  delete: string
  restore: string
  emptyTrash: string
  upload: string
  replace: string
  details: string
  preview: string
  download: string
  zip: string
  share: string
  links: string
  revoke: string
}

/**
 * The `file-manager` component of alfasix/alfakit-file-manager: the file manager page, or
 * the browser of a `FileManagerPicker` (`mode: 'picker'`, without a listing until it opens).
 */
export interface FileManagerSchema {
  type: 'file-manager'
  key: string
  /** The action context of every request (`file-manager`). */
  actionComponent: string
  /** Picker: the context token of the file manager page (requests go to that page). */
  token?: string
  mode: 'manager' | 'picker'
  actions: FileManagerActionNames
  disks: Array<{ name: string; label: string }>
  disk: string
  path: string
  listing?: FileManagerListingSchema
  /** The root's folders. */
  tree?: FileManagerFolderSchema[]
  permissions: FileManagerPermissionsSchema
  readOnly?: boolean
  /** Upload limits: bytes, accepted types (`image/*`, `.csv`), parallel uploads. */
  upload?: { maxSize: number; accept?: string[]; parallel: number; policy?: string | null }
  zip?: { maxSize: number; maxFiles: number }
  search: { recursive: boolean }
  trash?: boolean
  /** Link expiries in minutes; `publicLinks` adds revocable links that may never expire. */
  share?: { expiries: number[]; publicLinks?: boolean }
  view: 'grid' | 'list'
  /** The most items one operation may select. */
  maxItems: number
  /** Picker: several files may be chosen. */
  multiple?: boolean
  /** Picker: only these types may be chosen. */
  accept?: string[]
  /** Keep `?disk=…&path=…` in the address bar in sync with the open folder. */
  syncUrl?: boolean
}

/** `details`: one item with its detected type, image size, item count, links. */
export interface FileManagerDetailsSchema extends FileManagerEntrySchema {
  width?: number
  height?: number
  /** Folders: the number of entries (`itemsTruncated` when there are more). */
  items?: number
  itemsTruncated?: boolean
  /** Public links of the file. */
  links?: number
  /** The parent folder's path. */
  location?: string
}

/** `preview`: what the preview dialog shows. */
export interface FileManagerPreviewSchema {
  path: string
  kind: FileManagerKind
  mime?: string | null
  previewable: boolean
  /** A signed inline URL (images, PDFs, players). */
  url?: string
  /** The text of text files, cut at the server's size cap (`truncated`). */
  text?: string
  truncated?: boolean
  /** The user may save an edited image over the file. */
  editable?: boolean
  downloadUrl?: string
}

/** A stored public link of a file. */
export interface FileManagerLinkSchema {
  id: number
  url?: string
  expiresAt?: string
  expired?: boolean
  createdAt?: string
  downloads: number
}

/** Every action answers with the notifications it sent. */
export interface FileManagerResult {
  notifications?: NotificationSchema[]
  listing?: FileManagerListingSchema | null
}

/** A file shown in a `FileManagerPicker`. */
export interface FileManagerPickedFileSchema extends Partial<FileManagerEntrySchema> {
  value: string
  name: string
  /** The stored path no longer points at a file. */
  missing?: boolean
}

/** `FileManagerPicker`: files picked from the file manager; the state is their disk paths. */
export interface FileManagerPickerSchema extends BaseField {
  type: 'FileManagerPicker'
  multiple?: boolean
  maxFiles?: number
  accept?: string[]
  files: FileManagerPickedFileSchema[]
  browser: FileManagerSchema
}
