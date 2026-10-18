import type { LanguageSwitcherPosition, LocalizationSchema, PanelSchema } from '@alfakit/core'
import { router } from '@inertiajs/core'
import { fireEvent, render, screen } from '@testing-library/react'
import { Topbar } from '../src/components/panel/topbar'
import { UserMenu } from '../src/components/panel/user-menu'
import { SidebarProvider } from '../src/components/ui/sidebar'
import { AppLayout } from '../src/layouts/app-layout'
import { Wrapper, panel, registry, setPageProps } from './mocks'

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

const open = (element: Element) =>
  fireEvent.pointerDown(element, { button: 0, ctrlKey: false, pointerType: 'mouse' })

const renderTopbar = () =>
  render(
    <Wrapper>
      <SidebarProvider>
        <Topbar />
      </SidebarProvider>
    </Wrapper>,
  )

afterEach(() => {
  setPageProps({ alfakit: panel })
  vi.mocked(router.post).mockClear()
})

describe('language switcher', () => {
  it('renders a languages button in the top bar when configured', () => {
    withPanel({ localization: localization('topbar') })
    const { container } = renderTopbar()

    const slot = container.querySelector('[data-slot="topbar"] [data-slot="language-switcher"]')
    expect(slot).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Change language' })).toHaveAttribute(
      'aria-haspopup',
      'menu',
    )
  })

  it('stays out of the top bar by default', () => {
    withPanel({ localization: localization('user-menu') })
    const { container } = renderTopbar()

    expect(container.querySelector('[data-slot="language-switcher"]')).toBeNull()
  })

  it('lists each language in its own name, marks the current one and switches', () => {
    withPanel({ localization: localization('both') })
    renderTopbar()
    open(screen.getByRole('button', { name: 'Change language' }))

    const items = screen.getAllByRole('menuitemradio')
    expect(items.map((item) => item.textContent)).toEqual(['English', 'العربية', '日本語', 'فارسی'])
    expect(items[0]).toHaveAttribute('aria-checked', 'true')
    expect(items[0]).toHaveAttribute('data-current', 'true')
    expect(items[1]).toHaveAttribute('aria-checked', 'false')
    expect(items[1]).toHaveAttribute('lang', 'ar')
    expect(items[1]!.querySelector('[dir="rtl"]')).toHaveTextContent('العربية')

    fireEvent.click(items[1]!)
    expect(router.post).toHaveBeenCalledWith(
      '/admin/_alfakit/locale',
      { locale: 'ar' },
      expect.objectContaining({ preserveState: false }),
    )
  })

  it('does not post when the current language is picked again', () => {
    withPanel({ localization: localization('topbar') })
    renderTopbar()
    open(screen.getByRole('button', { name: 'Change language' }))

    fireEvent.click(screen.getAllByRole('menuitemradio')[0]!)
    expect(router.post).not.toHaveBeenCalled()
  })

  it.each([
    ['user-menu', 'always'],
    ['both', 'always'],
    ['topbar', 'phones'],
    ['hidden', 'never'],
  ] as const)('shows the user menu submenu for %s: %s', (position, shown) => {
    withPanel({ localization: localization(position) })
    render(
      <Wrapper>
        <UserMenu variant="topbar" />
      </Wrapper>,
    )
    open(screen.getByRole('button', { name: 'Ann' }))

    const item = screen.queryByRole('menuitem', { name: /Language/ })
    expect(item !== null).toBe(shown !== 'never')
    // `'topbar'`: only below `sm`, where the top bar button is hidden.
    if (item) expect(item.classList.contains('sm:hidden')).toBe(shown === 'phones')
  })

  it.each(['topbar', 'both'] as const)(
    'moves the %s button into the user menu on phones',
    (position) => {
      withPanel({ localization: localization(position) })
      const { container } = renderTopbar()

      const wrapper = container.querySelector('[data-slot="topbar-language"]')
      expect(wrapper).toHaveClass('hidden', 'sm:contents')
      expect(wrapper?.querySelector('[data-slot="language-switcher"]')).not.toBeNull()
    },
  )

  it('keeps the top bar button on phones without a user menu', () => {
    withPanel({ localization: localization('topbar'), userMenu: undefined })
    const { container } = renderTopbar()

    expect(container.querySelector('[data-slot="topbar-language"]')).toBeNull()
    expect(container.querySelector('[data-slot="language-switcher"]')).not.toBeNull()
  })

  it('hides everywhere in the panel with hidden', () => {
    withPanel({ localization: localization('hidden') })
    const { container } = renderTopbar()

    expect(container.querySelector('[data-slot="language-switcher"]')).toBeNull()
  })

  it('works right to left with the current language marked', () => {
    withPanel({ localization: localization('topbar', locales[1]) })
    renderTopbar()
    open(screen.getByRole('button', { name: 'Change language' }))

    const current = screen.getByRole('menuitemradio', { checked: true })
    expect(current).toHaveTextContent('العربية')
    expect(current.querySelector('span[dir="rtl"]')).not.toBeNull()
    expect(
      screen.getByRole('menuitemradio', { name: '日本語' }).querySelector('[dir="ltr"]'),
    ).not.toBeNull()
  })

  it('keeps the button on the phone bar of topbar(false) panels', () => {
    withPanel({ topbar: false, localization: localization('both') })
    const { container } = render(
      <Wrapper>
        <AppLayout>
          <p>Body</p>
        </AppLayout>
      </Wrapper>,
    )

    expect(
      container.querySelector('[data-variant="mobile"] [data-slot="language-switcher"]'),
    ).not.toBeNull()
  })

  it('uses a registered panel:language-switcher component', () => {
    withPanel({ localization: localization('topbar') })
    registry.register('panel:language-switcher', () => <span data-testid="custom">Custom</span>)

    try {
      renderTopbar()
      expect(screen.getByTestId('custom')).toBeInTheDocument()
    } finally {
      registry.register('panel:language-switcher', undefined as never)
    }
  })
})
