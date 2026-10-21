import type { ComponentRegistry } from '@alfakit/core'
import { ActionRunner, Translator, type AlfakitPageProps, type PanelSchema } from '@alfakit/core'
import { mount, type ComponentMountingOptions } from '@vue/test-utils'
import { defineComponent, h, type Component } from 'vue'
import TooltipProvider from '../src/components/ui/TooltipProvider.vue'
import { ALFAKIT_KEY, type AnyComponent } from '../src/context'
import { panelLayouts } from '../src/layouts/panel-layouts'
import { createDefaultRegistry } from '../src/registry'

export const panel: PanelSchema = {
  id: 'admin',
  path: 'admin',
  url: 'http://localhost/admin',
  brandName: 'Test',
  darkMode: { enabled: true, forced: false },
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
    locale: '/locale',
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

// The panel's layouts up front, as `createAlfakit()` registers them.
export const registry: ComponentRegistry<AnyComponent> =
  createDefaultRegistry().registerMany(panelLayouts)
export const actions = new ActionRunner({ endpoints: { action: '/a', modal: '/m' } })

/** Mount a render function inside the Alfakit providers (context + tooltips), attached to the document. */
export function mountWithAlfakit(
  render: () => unknown,
  options: ComponentMountingOptions<unknown> = {},
) {
  const Wrapper: Component = defineComponent({
    setup: () => () => h(TooltipProvider, null, () => render()),
  })

  return mount(Wrapper, {
    attachTo: document.body,
    ...options,
    global: {
      provide: {
        [ALFAKIT_KEY as symbol]: {
          registry,
          pages: {},
          actions,
          translator: new Translator(panel.translations),
        },
      },
      ...options.global,
    },
  })
}

export function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}
