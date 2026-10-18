import { render, screen } from '@testing-library/react'
import { ViewComponent } from '../src/components/layout/prime'
import { Breadcrumbs } from '../src/components/panel/topbar'
import { Wrapper, panel } from './mocks'

describe('renderer strings', () => {
  afterEach(() => {
    delete panel.translations.component_not_registered
    delete panel.translations.breadcrumbs
  })

  it('translates the unregistered-component notice', () => {
    panel.translations.component_not_registered = 'Komponente :component fehlt.'

    render(
      <Wrapper>
        <ViewComponent component={{ type: 'View', key: 'v', component: 'Nope' }} />
      </Wrapper>,
    )

    expect(screen.getByText('Komponente Nope fehlt.')).toBeInTheDocument()
  })

  it('translates the breadcrumb landmark', () => {
    panel.translations.breadcrumbs = 'Brotkrümel'

    render(
      <Wrapper>
        <Breadcrumbs items={[{ label: 'Posts', url: '/posts' }]} />
      </Wrapper>,
    )

    expect(screen.getByRole('navigation', { name: 'Brotkrümel' })).toBeInTheDocument()
  })
})
