import { render } from '@testing-library/react'
import { TopNavLayout } from '../src/layouts/top-nav-layout'
import { Wrapper, panel, setPageProps } from './mocks'

describe('top bar layout', () => {
  // The sidebar holds the tenant switcher in the other layouts; without it here, users of
  // the `topbar` layout could not change tenant at all.
  it('shows the tenant switcher in the top bar', () => {
    setPageProps({
      alfakit: {
        ...panel,
        tenancy: {
          current: { id: 2, name: 'Maison Alfa Dubai', url: '/admin/dubai' },
          tenants: [
            { id: 1, name: 'Maison Alfa Manama', url: '/admin/manama' },
            { id: 2, name: 'Maison Alfa Dubai', url: '/admin/dubai' },
          ],
        },
      },
    })

    const { container } = render(
      <Wrapper>
        <TopNavLayout>
          <p>Body</p>
        </TopNavLayout>
      </Wrapper>,
    )

    const trigger = container.querySelector('[data-slot="topbar"] [data-slot="tenant-menu"]')
    expect(trigger).not.toBeNull()
    expect(trigger).toHaveTextContent('Maison Alfa Dubai')
  })
})
