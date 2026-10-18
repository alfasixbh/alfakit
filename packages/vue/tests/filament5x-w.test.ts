import type { PanelSchema } from '@alfakit/core'
import { router } from '@inertiajs/vue3'
import { h } from 'vue'
import GlobalSearch from '../src/components/panel/GlobalSearch.vue'
import NavGroup from '../src/components/panel/NavGroup.vue'
import TenantMenu from '../src/components/panel/TenantMenu.vue'
import SidebarProvider from '../src/components/ui/SidebarProvider.vue'
import { flush, mountWithAlfakit, panel, setPageProps } from './mocks'

const withPanel = (overrides: Partial<PanelSchema>) =>
  setPageProps({ alfakit: { ...panel, ...overrides } })

const respond = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })

const until = async (check: () => boolean) => {
  for (let attempt = 0; attempt < 50 && !check(); attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 10))
    await flush()
  }
}

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  Element.prototype.scrollIntoView ??= () => {}
})

afterEach(() => {
  setPageProps({ alfakit: panel })
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('navigation items (Filament 5.1, 5.10.2)', () => {
  it('renders Htmlable labels as markup and merges extra attributes', () => {
    const wrapper = mountWithAlfakit(() =>
      h(SidebarProvider, null, () =>
        h(NavGroup, {
          group: {
            collapsible: false,
            items: [
              {
                label: 'Inbox <b>new</b>',
                labelHtml: true,
                url: '/inbox',
                extraAttributes: { class: 'inbox-link', 'data-tour': 'inbox' },
              },
              { label: '<i>Plain</i>', url: '/plain' },
            ],
          },
        }),
      ),
    )

    const link = wrapper.find('[data-tour="inbox"]')
    expect(link.attributes('href')).toBe('/inbox')
    expect(link.classes()).toContain('inbox-link')
    expect(link.find('b').text()).toBe('new')
    expect(wrapper.text()).toContain('<i>Plain</i>')
    wrapper.unmount()
  })

  it('renders Htmlable tenant names as markup', () => {
    withPanel({
      tenancy: {
        current: { id: 1, name: 'Acme <strong>Pro</strong>', nameHtml: true, url: '/acme' },
        tenants: [],
      },
    })

    const wrapper = mountWithAlfakit(() => h(TenantMenu, { variant: 'topbar' }))
    expect(wrapper.find('strong').text()).toBe('Pro')
    wrapper.unmount()
  })
})

describe('global search (Filament 5.10)', () => {
  it('announces the result count and starts over after closing or navigating', async () => {
    const handlers: Array<() => void> = []
    vi.spyOn(router, 'on').mockImplementation(((name: string, handler: () => void) => {
      if (name === 'navigate') handlers.push(handler)

      return () => {}
    }) as typeof router.on)
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation(async () =>
          respond({ groups: [{ label: 'Posts', results: [{ title: 'Hello', url: '/posts/1' }] }] }),
        ),
    )
    withPanel({ globalSearch: { keyBindings: [], placeholder: 'Search', debounce: 0 } })

    const wrapper = mountWithAlfakit(() => h(GlobalSearch), { attachTo: document.body })
    const input = () => document.querySelector<HTMLInputElement>('[role="dialog"] input')
    const type = async (value: string) => {
      input()!.value = value
      input()!.dispatchEvent(new Event('input', { bubbles: true }))
      await flush()
    }

    await wrapper.find('button').trigger('click')
    await until(() => input() !== null)
    await type('hel')
    await until(
      () => document.querySelector('[role="status"]')?.textContent?.includes('1 result') ?? false,
    )
    expect(document.querySelector('[role="status"]')?.textContent).toContain('1 result available.')

    handlers.forEach((handler) => handler())
    await until(() => input() === null)
    expect(input()).toBeNull()

    await wrapper.find('button').trigger('click')
    await until(() => input() !== null)
    expect(input()!.value).toBe('')
    expect(document.body.textContent).not.toContain('Hello')
    wrapper.unmount()
  })
})
