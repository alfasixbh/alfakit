import type { LanguageSwitcherPosition, LocalizationSchema, PanelSchema } from '@alfakit/core'
import { router } from '@inertiajs/core'
import { fireEvent, render, screen } from '@testing-library/svelte'
import LanguageSwitcherHarness from './LanguageSwitcherHarness.svelte'
import { panel, registry, setPageProps } from './mocks'

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

afterEach(() => {
  setPageProps({ alfakit: panel })
  vi.mocked(router.post).mockClear()
})

describe('language switcher', () => {
  it('renders a languages button in the top bar when configured', () => {
    withPanel({ localization: localization('topbar') })
    const { container } = render(LanguageSwitcherHarness, { props: { kind: 'topbar' } })

    expect(
      container.querySelector('[data-slot="topbar"] [data-slot="language-switcher"]'),
    ).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Change language' })).toHaveAttribute(
      'aria-haspopup',
      'menu',
    )
  })

  it.each(['user-menu', 'hidden'] as const)('stays out of the top bar with %s', (position) => {
    withPanel({ localization: localization(position) })
    const { container } = render(LanguageSwitcherHarness, { props: { kind: 'topbar' } })

    expect(container.querySelector('[data-slot="language-switcher"]')).toBeNull()
  })

  it('lists each language in its own name, marks the current one and switches', async () => {
    withPanel({ localization: localization('both') })
    render(LanguageSwitcherHarness, { props: { kind: 'topbar' } })
    await open(screen.getByRole('button', { name: 'Change language' }))

    const items = await screen.findAllByRole('menuitemradio')
    expect(items.map((item) => item.textContent?.trim())).toEqual([
      'English',
      'العربية',
      '日本語',
      'فارسی',
    ])
    expect(items[0]).toHaveAttribute('aria-checked', 'true')
    expect(items[0]).toHaveAttribute('data-current', 'true')
    expect(items[1]).toHaveAttribute('aria-checked', 'false')
    expect(items[1]).toHaveAttribute('lang', 'ar')
    expect(items[1]!.querySelector('[dir="rtl"]')).toHaveTextContent('العربية')

    await fireEvent.click(items[1]!)
    expect(router.post).toHaveBeenCalledWith(
      '/admin/_alfakit/locale',
      { locale: 'ar' },
      expect.objectContaining({ preserveState: false }),
    )
  })

  it.each([
    ['user-menu', 'always'],
    ['both', 'always'],
    ['topbar', 'phones'],
    ['hidden', 'never'],
  ] as const)('shows the user menu submenu for %s: %s', async (position, shown) => {
    withPanel({ localization: localization(position) })
    render(LanguageSwitcherHarness, { props: { kind: 'user-menu' } })
    await open(screen.getByRole('button', { name: 'Ann' }))
    await screen.findAllByRole('menuitem')

    const item = screen.queryByRole('menuitem', { name: /Language/ })
    expect(item !== null).toBe(shown !== 'never')
    // `'topbar'`: only below `sm`, where the top bar button is hidden.
    if (item) expect(item.classList.contains('sm:hidden')).toBe(shown === 'phones')
  })

  it.each(['topbar', 'both'] as const)(
    'moves the %s button into the user menu on phones',
    (position) => {
      withPanel({ localization: localization(position) })
      const { container } = render(LanguageSwitcherHarness, { props: { kind: 'topbar' } })

      const slot = container.querySelector('[data-slot="topbar-language"]')
      expect(slot).toHaveClass('hidden', 'sm:contents')
      expect(slot?.querySelector('[data-slot="language-switcher"]')).not.toBeNull()
    },
  )

  it('keeps the top bar button on phones without a user menu', () => {
    withPanel({ localization: localization('topbar'), userMenu: undefined })
    const { container } = render(LanguageSwitcherHarness, { props: { kind: 'topbar' } })

    expect(container.querySelector('[data-slot="topbar-language"]')).toBeNull()
    expect(container.querySelector('[data-slot="language-switcher"]')).not.toBeNull()
  })

  it('works right to left with the current language marked', async () => {
    withPanel({ localization: localization('topbar', locales[1]) })
    render(LanguageSwitcherHarness, { props: { kind: 'topbar' } })
    await open(screen.getByRole('button', { name: 'Change language' }))

    const current = await screen.findByRole('menuitemradio', { checked: true })
    expect(current).toHaveTextContent('العربية')
    expect(current.querySelector('span[dir="rtl"]')).not.toBeNull()
    expect(
      screen.getByRole('menuitemradio', { name: '日本語' }).querySelector('[dir="ltr"]'),
    ).not.toBeNull()
  })

  it('keeps the button on the phone bar of topbar(false) panels', () => {
    withPanel({ topbar: false, localization: localization('both') })
    const { container } = render(LanguageSwitcherHarness, { props: { kind: 'app' } })

    expect(
      container.querySelector('[data-variant="mobile"] [data-slot="language-switcher"]'),
    ).not.toBeNull()
  })

  it('uses a registered panel:language-switcher component', async () => {
    withPanel({ localization: localization('topbar') })
    const { default: Custom } = await import('./CustomLanguageSwitcher.svelte')
    registry.register('panel:language-switcher', Custom)

    try {
      render(LanguageSwitcherHarness, { props: { kind: 'topbar' } })
      expect(screen.getByTestId('custom')).toBeInTheDocument()
    } finally {
      registry.register('panel:language-switcher', undefined as never)
    }
  })
})
