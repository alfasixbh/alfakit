import type { ComponentRegistry } from '@alfakit/core'
import { ActionRunner, Translator, type AlfakitPageProps, type PanelSchema } from '@alfakit/core'
import type { ReactNode } from 'react'
import { TooltipProvider } from '../src/components/ui/tooltip'
import { AlfakitProvider, type AnyComponent } from '../src/context'
import { panelLayouts } from '../src/layouts/panel-layouts'
import { createDefaultRegistry } from '../src/registry'

export const panel: PanelSchema = {
  id: 'admin',
  path: 'admin',
  url: 'http://localhost/admin',
  brandName: 'Test',
  darkMode: { enabled: true, forced: false },
  sidebarCollapsibleOnDesktop: true,
  breadcrumbs: true,
  navigation: [],
  endpoints: {
    action: '/a',
    modal: '/m',
    schemaRefresh: '/r',
    schemaOptions: '/o',
    tableCell: '/c',
    tableReorder: '/re',
    upload: '/u',
    uploadDestroy: '/ud',
    globalSearch: '/g',
    notifications: '/n',
    notificationsReadAll: '/nr',
    notificationsDestroyAll: '/nd',
    logout: '/logout',
  },
  auth: {},
  flashKey: 'alfakitNotifications',
  locale: 'en',
  direction: 'ltr',
  csrf: 'token',
  translations: { select_option: 'Select an option' },
}

globalThis.__alfakitPageProps = { alfakit: panel } satisfies AlfakitPageProps

export function setPageProps(props: Partial<AlfakitPageProps>): void {
  globalThis.__alfakitPageProps = { ...globalThis.__alfakitPageProps, ...props }
}

// The panel's layouts up front, as `createAlfakit()` registers them.
export const registry: ComponentRegistry<AnyComponent> =
  createDefaultRegistry().registerMany(panelLayouts)
export const actions = new ActionRunner({ endpoints: { action: '/a', modal: '/m' } })

export function Wrapper({ children }: { children: ReactNode }) {
  return (
    <AlfakitProvider
      value={{ registry, pages: {}, actions, translator: new Translator(panel.translations) }}
    >
      <TooltipProvider>{children}</TooltipProvider>
    </AlfakitProvider>
  )
}
