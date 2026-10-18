import { h } from 'vue'
import UserMenu from '../src/components/panel/UserMenu.vue'
import { mountWithAlfakit, panel, setPageProps } from './mocks'

// Guests of a `guestAccess()` panel get a sign-in link where the user menu would be.
describe('user menu for guests', () => {
  afterEach(() => setPageProps({ alfakit: panel }))

  it.each(['sidebar', 'topbar'] as const)('links to the login page (%s)', (variant) => {
    setPageProps({ alfakit: { ...panel, auth: { login: '/admin/login' } } })

    const wrapper = mountWithAlfakit(() => h(UserMenu, { variant }))
    const link = wrapper.find('[data-slot="sign-in-link"]')

    expect(link.attributes('href')).toBe('/admin/login')
    expect(link.text()).toContain('Sign in')
    wrapper.unmount()
  })

  it('renders nothing without a login page', () => {
    const wrapper = mountWithAlfakit(() => h(UserMenu))

    expect(wrapper.find('[data-slot="sign-in-link"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('shows the user menu, not the link, to signed-in users', () => {
    setPageProps({
      alfakit: {
        ...panel,
        auth: { login: '/admin/login' },
        user: { id: 1, name: 'Ann' },
        userMenu: { items: [], logoutUrl: '/admin/logout' },
      },
    })

    const wrapper = mountWithAlfakit(() => h(UserMenu, { variant: 'topbar' }))

    expect(wrapper.find('[data-slot="sign-in-link"]').exists()).toBe(false)
    expect(wrapper.find('button[aria-label="Ann"]').exists()).toBe(true)
    wrapper.unmount()
  })
})
