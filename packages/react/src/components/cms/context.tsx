import { createCmsTranslator, type CmsPayload, type Translator } from '@alfakit/core'
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useOptionalAlfakit, type AnyComponent } from '../../context'

export interface CmsContextValue {
  /** `t('cms.preview', {}, 'Preview')` over the page's strings (or the panel's). */
  t: Translator['t']
  /** Block renderers passed to `<CmsBlocks components>` / `<CmsPage components>`. */
  components: Record<string, AnyComponent>
  direction: 'ltr' | 'rtl'
  preview: boolean
}

const CmsContext = createContext<CmsContextValue | null>(null)

/**
 * The strings, direction and block renderers of a CMS page. `CmsPage` provides it; wrap
 * your own page in it when you render `<CmsBlocks>` outside `CmsPage`.
 */
export function CmsProvider({
  payload,
  components,
  children,
}: {
  payload?: Pick<CmsPayload, 'translations' | 'site' | 'preview'> | null
  components?: Record<string, AnyComponent>
  children: ReactNode
}) {
  const alfakit = useOptionalAlfakit()

  const value = useMemo<CmsContextValue>(() => {
    // Inside a panel app the shared translator already has `cms.*`; a public page brings its own.
    const translator = payload?.translations
      ? createCmsTranslator(payload)
      : (alfakit?.translator ?? createCmsTranslator(null))

    return {
      t: translator.t.bind(translator),
      components: components ?? {},
      direction: payload?.site?.direction ?? 'ltr',
      preview: payload?.preview ?? false,
    }
  }, [payload, components, alfakit])

  return <CmsContext.Provider value={value}>{children}</CmsContext.Provider>
}

const FALLBACK: CmsContextValue = {
  t: (key, replacements, fallback) => createCmsTranslator(null).t(key, replacements, fallback),
  components: {},
  direction: 'ltr',
  preview: false,
}

export function useCms(): CmsContextValue {
  return useContext(CmsContext) ?? FALLBACK
}
