import { createCmsTranslator, type CmsPayload, type Translator } from '@alfakit/core'
import { computed, inject, provide, type ComputedRef, type InjectionKey } from 'vue'
import { useOptionalAlfakit, type AnyComponent } from '../../context'

export interface CmsContextValue {
  /** `t('cms.preview', {}, 'Preview')` over the page's strings (or the panel's). */
  t: Translator['t']
  /** Block renderers passed to `<CmsBlocks :components>` / `<CmsPage :components>`. */
  components: Record<string, AnyComponent>
  direction: 'ltr' | 'rtl'
  preview: boolean
}

export const CMS_KEY: InjectionKey<ComputedRef<CmsContextValue>> = Symbol('alfakit.cms')

/** Block renderers of an outer `<CmsBlocks :components>`, for blocks inside columns. */
export const CMS_COMPONENTS_KEY: InjectionKey<Record<string, AnyComponent>> =
  Symbol('alfakit.cms.components')

/** Blocks inside a columns block: the column already has the page padding. */
export const CMS_NESTED_KEY: InjectionKey<boolean> = Symbol('alfakit.cms.nested')

type PayloadSource = () => Pick<CmsPayload, 'translations' | 'site' | 'preview'> | null | undefined

/**
 * Provide the strings, direction and block renderers of a CMS page. `CmsPage` calls it;
 * call it in your own page when you render `<CmsBlocks>` outside `CmsPage`.
 */
export function provideCms(
  payload: PayloadSource,
  components: () => Record<string, AnyComponent> | undefined = () => undefined,
): ComputedRef<CmsContextValue> {
  const alfakit = useOptionalAlfakit()

  const value = computed<CmsContextValue>(() => {
    const current = payload()
    // Inside a panel app the shared translator already has `cms.*`; a public page brings its own.
    const translator = current?.translations
      ? createCmsTranslator(current)
      : (alfakit?.translator ?? createCmsTranslator(null))

    return {
      t: translator.t.bind(translator),
      components: components() ?? {},
      direction: current?.site?.direction ?? 'ltr',
      preview: current?.preview ?? false,
    }
  })

  provide(CMS_KEY, value)

  return value
}

const FALLBACK = computed<CmsContextValue>(() => {
  const translator = createCmsTranslator(null)

  return { t: translator.t.bind(translator), components: {}, direction: 'ltr', preview: false }
})

export function useCms(): ComputedRef<CmsContextValue> {
  return inject(CMS_KEY, FALLBACK)
}

/** `t()` of the current CMS context. */
export function useCmsT(): Translator['t'] {
  const cms = useCms()

  return (key, replacements, fallback) => cms.value.t(key, replacements, fallback)
}

const SECTION = 'px-4 py-12 sm:px-6 sm:py-16 lg:px-8'

/** The outer padding of a block, none when it is nested in a column. */
export function useSectionClass(extra = ''): string {
  return inject(CMS_NESTED_KEY, false) ? 'py-3' : `${SECTION} ${extra}`.trim()
}
