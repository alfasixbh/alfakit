import { createCmsTranslator, type CmsPayload, type Translator } from '@alfakit/core'
import { getContext, hasContext, setContext } from 'svelte'
import { useOptionalAlfakit, type AnyComponent } from '../../context.svelte'

export interface CmsContextValue {
  /** `t('cms.preview', {}, 'Preview')` over the page's strings (or the panel's). */
  readonly t: Translator['t']
  /** Block renderers passed to `<CmsBlocks components>` / `<CmsPage components>`. */
  readonly components: Record<string, AnyComponent>
  readonly direction: 'ltr' | 'rtl'
  readonly preview: boolean
}

const CMS_CONTEXT = Symbol.for('alfakit.cms')

/** Block renderers of an outer `<CmsBlocks components>`, for blocks inside columns. */
export const CMS_COMPONENTS_CONTEXT = Symbol.for('alfakit.cms.components')

/** Blocks inside a columns block: the column already has the page padding. */
export const CMS_NESTED_CONTEXT = Symbol.for('alfakit.cms.nested')

type PayloadSource = () => Pick<CmsPayload, 'translations' | 'site' | 'preview'> | null | undefined

/**
 * Provide the strings, direction and block renderers of a CMS page (call during component
 * initialisation). `CmsPage` calls it; call it in your own page when you render
 * `<CmsBlocks>` outside `CmsPage`. The getters follow the payload on every navigation.
 */
export function provideCms(
  payload: PayloadSource,
  components: () => Record<string, AnyComponent> | undefined = () => undefined,
): CmsContextValue {
  const alfakit = useOptionalAlfakit()

  const translator = () => {
    const current = payload()

    // Inside a panel app the shared translator already has `cms.*`; a public page brings its own.
    return current?.translations
      ? createCmsTranslator(current)
      : (alfakit?.translator ?? createCmsTranslator(null))
  }

  const value: CmsContextValue = {
    get t() {
      const current = translator()

      return current.t.bind(current)
    },
    get components() {
      return components() ?? {}
    },
    get direction() {
      return payload()?.site?.direction ?? 'ltr'
    },
    get preview() {
      return payload()?.preview ?? false
    },
  }

  setContext(CMS_CONTEXT, value)

  return value
}

const FALLBACK: CmsContextValue = {
  get t() {
    const translator = createCmsTranslator(null)

    return translator.t.bind(translator)
  },
  components: {},
  direction: 'ltr',
  preview: false,
}

export function useCms(): CmsContextValue {
  return hasContext(CMS_CONTEXT) ? getContext<CmsContextValue>(CMS_CONTEXT) : FALLBACK
}

const SECTION = 'px-4 py-12 sm:px-6 sm:py-16 lg:px-8'

/** The outer padding of a block, none when it is nested in a column (call during initialisation). */
export function useSectionClass(extra = ''): string {
  return hasContext(CMS_NESTED_CONTEXT) && getContext<boolean>(CMS_NESTED_CONTEXT)
    ? 'py-3'
    : `${SECTION} ${extra}`.trim()
}

export const CMS_LINK_CLASS =
  'hover:text-foreground focus-visible:ring-ring/50 rounded-md px-3 py-2 text-sm font-medium outline-none focus-visible:ring-[3px] data-[active]:text-foreground text-muted-foreground aria-[current=page]:text-foreground'
