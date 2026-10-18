import { render, screen } from '@testing-library/svelte'
import ViewComponent from '../src/components/layout/ViewComponent.svelte'
import Breadcrumbs from '../src/components/panel/Breadcrumbs.svelte'
import { panel } from './mocks'
import Wrapper from './Wrapper.svelte'

describe('renderer strings', () => {
  afterEach(() => {
    delete panel.translations.component_not_registered
    delete panel.translations.breadcrumbs
  })

  it('translates the unregistered-component notice', () => {
    panel.translations.component_not_registered = 'Komponente :component fehlt.'

    render(Wrapper, {
      props: {
        component: ViewComponent,
        props: { component: { type: 'View', key: 'v', component: 'Nope' } },
      },
    })

    expect(screen.getByText('Komponente Nope fehlt.')).toBeInTheDocument()
  })

  it('translates the breadcrumb landmark', () => {
    panel.translations.breadcrumbs = 'Brotkrümel'

    render(Wrapper, {
      props: { component: Breadcrumbs, props: { items: [{ label: 'Posts', url: '/posts' }] } },
    })

    expect(screen.getByRole('navigation', { name: 'Brotkrümel' })).toBeInTheDocument()
  })
})
