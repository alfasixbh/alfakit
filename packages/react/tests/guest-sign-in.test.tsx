import { render } from '@testing-library/react'
import { UserMenu } from '../src/components/panel/user-menu'
import { Wrapper, panel, setPageProps } from './mocks'

// Guests of a `guestAccess()` panel get a sign-in link where the user menu would be.
describe('user menu for guests', () => {
  afterEach(() => setPageProps({ alfakit: panel }))

  it.each(['sidebar', 'topbar'] as const)('links to the login page (%s)', (variant) => {
    setPageProps({ alfakit: { ...panel, auth: { login: '/admin/login' } } })

    const { container } = render(
      <Wrapper>
        <UserMenu variant={variant} />
      </Wrapper>,
    )

    const link = container.querySelector('[data-slot="sign-in-link"]')
    expect(link).toHaveAttribute('href', '/admin/login')
    expect(link).toHaveTextContent('Sign in')
  })

  it('renders nothing without a login page', () => {
    const { container } = render(
      <Wrapper>
        <UserMenu />
      </Wrapper>,
    )

    expect(container).toBeEmptyDOMElement()
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

    const { container } = render(
      <Wrapper>
        <UserMenu variant="topbar" />
      </Wrapper>,
    )

    expect(container.querySelector('[data-slot="sign-in-link"]')).toBeNull()
    expect(container.querySelector('button[aria-label="Ann"]')).not.toBeNull()
  })
})
