import type { AnyActionSchema } from './actions'
import type { RecordKey } from './common'
import type { ContentBlock, LocalizationSchema, PanelEndpoints } from './panel'

/**
 * The payload of a component used outside a panel (`AlfaSix\Alfakit\Standalone\Form`,
 * `Table`, `Infolist`, `Widgets`, `Component`), passed as an Inertia prop of any page of
 * the application and rendered by `<AlfakitComponent>`. It carries everything the renderer
 * needs, so the page needs no `createAlfakit()` and no panel layout.
 */
export interface StandaloneComponentSchema {
  /** Marks the prop as a standalone component. */
  alfakit: 'standalone'
  /** The PHP class, part of the form identity. */
  class: string
  heading?: string | null
  subheading?: string | null
  headerActions?: AnyActionSchema[] | null
  content: ContentBlock[]
  /** Encrypted context token for the internal endpoints, bound to the current user. */
  token: string
  record?: RecordKey | null
  /** Poll targets (`widget:<id>`) of lazy components, fetched right after mounting. */
  lazy?: string[] | null
  /** `alfakit.uploads.chunk_size` in bytes: larger files are uploaded in chunks. */
  uploadChunkSize?: number
  endpoints: Pick<
    PanelEndpoints,
    | 'action'
    | 'modal'
    | 'schemaRefresh'
    | 'schemaOptions'
    | 'schemaValidate'
    | 'tableCell'
    | 'tableReorder'
    | 'tableColumns'
    | 'upload'
    | 'uploadDestroy'
    | 'uploadChunks'
  > & {
    /** Fresh schemas of lazy and polled components, by token. */
    components: string
  }
  localization: LocalizationSchema
  translations: Record<string, unknown>
  csrf: string
  flashKey: string
}

/** Whether an Inertia prop value is a standalone component payload. */
export function isStandaloneComponent(value: unknown): value is StandaloneComponentSchema {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { alfakit?: unknown }).alfakit === 'standalone' &&
    typeof (value as { token?: unknown }).token === 'string'
  )
}
