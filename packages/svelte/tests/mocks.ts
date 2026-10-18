import type { ComponentRegistry } from '@alfakit/core'
import { ActionRunner, Translator, type AlfakitPageProps, type PanelSchema } from '@alfakit/core'
import type { AlfakitContextValue, AnyComponent } from '../src/context.svelte'
import { createDefaultRegistry } from '../src/registry'

export const panel: PanelSchema = {
  id: 'admin',
  path: 'admin',
  url: 'http://localhost/admin',
  brandName: 'Test',
  darkMode: { enabled: true, forced: false },
  sidebarCollapsibleOnDesktop: true,
  breadcrumbs: true,
  theme: {
    name: 'alfakit',
    attribute: 'alfakit',
    sidebar: 'inset',
    density: 'comfortable',
    design: {
      layout: 'sidebar',
      nav: 'soft',
      header: 'plain',
      surfaces: 'bordered',
      inputs: 'outline',
      buttons: 'rounded',
      tables: 'lined',
    },
  },
  navigation: [],
  endpoints: {
    action: '/a',
    modal: '/m',
    schemaRefresh: '/r',
    schemaOptions: '/o',
    tableCell: '/c',
    tableReorder: '/re',
    locale: '/locale',
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
  localization: {
    code: 'en',
    tag: 'en',
    label: 'English',
    direction: 'ltr',
    fallbackLocale: 'en',
    firstDayOfWeek: 0,
    currency: 'USD',
    timezone: 'UTC',
    switcher: false,
    locales: [],
  },
  csrf: 'token',
  translations: { select_option: 'Select an option' },
}

globalThis.__alfakitPageProps = { alfakit: panel } satisfies AlfakitPageProps

export function setPageProps(props: Partial<AlfakitPageProps>): void {
  globalThis.__alfakitPageProps = { ...globalThis.__alfakitPageProps, ...props }
}

export const registry: ComponentRegistry<AnyComponent> = createDefaultRegistry()
export const actions = new ActionRunner({ endpoints: { action: '/a', modal: '/m' } })

export const context: AlfakitContextValue = {
  registry,
  pages: {},
  actions,
  translator: new Translator(panel.translations),
}
