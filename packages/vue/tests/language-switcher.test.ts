import type { LanguageSwitcherPosition, LocalizationSchema, PanelSchema } from '@alfakit/core'
import { router } from '@inertiajs/core'
import { h } from 'vue'
import Topbar from '../src/components/panel/Topbar.vue'
import UserMenu from '../src/components/panel/UserMenu.vue'
import SidebarProvider from '../src/components/ui/SidebarProvider.vue'
import AppLayout from '../src/layouts/AppLayout.vue'
import { flush, mountWithAlfakit, panel, registry, setPageProps } from './mocks'

vi.mock('@inertiajs/core', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  router: { post: vi.fn(), visit: vi.fn(), reload: vi.fn(), on: () => () => {} },
}))

const locales: LocalizationSchema['locales'] = [
  { code: 'en', tag: 'en', label: 'English', direction: 'ltr' },
  { code: 'ar', tag: 'ar', label: 'العربية', direction: 'rtl' },
  { code: 'ja', tag: 'ja', label: '日本語', direction: 'ltr' },
  { code: 'fa', tag: 'fa', label: 'فارسی', direction: 'rtl' },
]

const localization = (
  switcherPosition: LanguageSwitcherPosition,
  current: LocalizationSchema['locales'][number] = locales[0]!,
): LocalizationSchema => ({
  ...current,
  fallbackLocale: 'en',
  firstDayOfWeek: 1,
  currency: 'USD',
  timezone: 'UTC',
  switcher: true,
  switcherPosition,
  locales,
})

const withPanel = (overrides: Partial<PanelSchema>) =>
  setPageProps({
    alfakit: {
      ...panel,
      user: { id: 1, name: 'Ann' },
      userMenu: { items: [], logoutUrl: '/admin/logout' },
      endpoints: { ...panel.endpoints, locale: '/admin/_alfakit/locale' },
      ...overrides,
    },
  })

async function openMenu(trigger: Element | null | undefined) {
  trigger?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  await flush()
  await flush()
}

const mountTopbar = () => mountWithAlfakit(() => h(SidebarProvider, null, () => h(Topbar)))
const trigger = () => document.body.querySelector('button[aria-label="Change language"]')
const items = () => [...document.body.querySelectorAll<HTMLElement>('[role="menuitemradio"]')]

afterEach(() => {
  setPageProps({ alfakit: panel })
  document.body.innerHTML = ''
  vi.mocked(router.post).mockClear()
})

describe('language switcher', () => {
  it('renders a languages button in the top bar when configured', () => {
    withPanel({ localization: localization('topbar') })
    const wrapper = mountTopbar()

    expect(wrapper.find('[data-slot="topbar"] [data-slot="language-switcher"]').exists()).toBe(true)
    expect(trigger()?.getAttribute('aria-haspopup')).toBe('menu')
    wrapper.unmount()
  })

  it('stays out of the top bar by default and with hidden', () => {
    for (const position of ['user-menu', 'hidden'] as const) {
      withPanel({ localization: localization(position) })
      const wrapper = mountTopbar()

      expect(wrapper.find('[data-slot="language-switcher"]').exists()).toBe(false)
      wrapper.unmount()
    }
  })

  it('lists each language in its own name, marks the current one and switches', async () => {
    withPanel({ localization: localization('both') })
    const wrapper = mountTopbar()
    await openMenu(trigger())

    expect(items().map((item) => item.textContent?.trim())).toEqual([
      'English',
      'العربية',
      '日本語',
      'فارسی',
    ])
    expect(items()[0]!.getAttribute('aria-checked')).toBe('true')
    expect(items()[0]!.getAttribute('data-current')).toBe('true')
    expect(items()[1]!.getAttribute('aria-checked')).toBe('false')
    expect(items()[1]!.getAttribute('lang')).toBe('ar')
    expect(items()[1]!.querySelector('[dir="rtl"]')?.textContent).toBe('العربية')

    items()[1]!.click()
    await flush()
    expect(router.post).toHaveBeenCalledWith(
      '/admin/_alfakit/locale',
      { locale: 'ar' },
      expect.objectContaining({ preserveState: false }),
    )
    wrapper.unmount()
  })

  it.each([
    ['user-menu', 'always'],
    ['both', 'always'],
    ['topbar', 'phones'],
    ['hidden', 'never'],
  ] as const)('shows the user menu submenu for %s: %s', async (position, shown) => {
    withPanel({ localization: localization(position) })
    const wrapper = mountWithAlfakit(() => h(UserMenu, { variant: 'topbar' }))
    await openMenu(document.body.querySelector('button[aria-label="Ann"]'))

    const item = [...document.body.querySelectorAll('[role="menuitem"]')].find((el) =>
      el.textContent?.includes('Language'),
    )
    expect(item !== undefined).toBe(shown !== 'never')
    // `'topbar'`: only below `sm`, where the top bar button is hidden.
    if (item) expect(item.classList.contains('sm:hidden')).toBe(shown === 'phones')
    wrapper.unmount()
  })

  it.each(['topbar', 'both'] as const)(
    'moves the %s button into the user menu on phones',
    async (position) => {
      withPanel({ localization: localization(position) })
      const wrapper = mountTopbar()
      await flush()

      const slot = document.body.querySelector('[data-slot="topbar-language"]')
      expect(slot?.classList.contains('hidden')).toBe(true)
      expect(slot?.classList.contains('sm:contents')).toBe(true)
      expect(slot?.querySelector('[data-slot="language-switcher"]')).not.toBeNull()
      wrapper.unmount()
    },
  )

  it('keeps the top bar button on phones without a user menu', async () => {
    withPanel({ localization: localization('topbar'), userMenu: undefined })
    const wrapper = mountTopbar()
    await flush()

    expect(document.body.querySelector('[data-slot="topbar-language"]')).toBeNull()
    expect(document.body.querySelector('[data-slot="language-switcher"]')).not.toBeNull()
    wrapper.unmount()
  })

  it('works right to left with the current language marked', async () => {
    withPanel({ localization: localization('topbar', locales[1]) })
    const wrapper = mountTopbar()
    await openMenu(trigger())

    const current = items().find((item) => item.getAttribute('aria-checked') === 'true')
    expect(current?.textContent?.trim()).toBe('العربية')
    expect(current?.querySelector('span[dir="rtl"]')).not.toBeNull()
    expect(items()[2]!.querySelector('[dir="ltr"]')).not.toBeNull()
    wrapper.unmount()
  })

  it('keeps the button on the phone bar of topbar(false) panels', () => {
    withPanel({ topbar: false, localization: localization('both') })
    const wrapper = mountWithAlfakit(() => h(AppLayout, null, () => h('p', 'Body')))

    expect(wrapper.find('[data-variant="mobile"] [data-slot="language-switcher"]').exists()).toBe(
      true,
    )
    wrapper.unmount()
  })

  it('uses a registered panel:language-switcher component', () => {
    withPanel({ localization: localization('topbar') })
    registry.register('panel:language-switcher', {
      render: () => h('span', { 'data-testid': 'custom' }, 'Custom'),
    })

    try {
      const wrapper = mountTopbar()
      expect(wrapper.find('[data-testid="custom"]').exists()).toBe(true)
      wrapper.unmount()
    } finally {
      registry.register('panel:language-switcher', undefined as never)
    }
  })
})
