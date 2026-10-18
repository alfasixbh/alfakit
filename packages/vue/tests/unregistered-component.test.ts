import { h } from 'vue'
import ViewComponent from '../src/components/layout/ViewComponent.vue'
import Breadcrumbs from '../src/components/panel/Breadcrumbs.vue'
import { mountWithAlfakit, panel } from './mocks'

describe('renderer strings', () => {
  afterEach(() => {
    delete panel.translations.component_not_registered
    delete panel.translations.breadcrumbs
  })

  it('translates the unregistered-component notice', () => {
    panel.translations.component_not_registered = 'Komponente :component fehlt.'

    const wrapper = mountWithAlfakit(() =>
      h(ViewComponent, { component: { type: 'View', key: 'v', component: 'Nope' } }),
    )

    expect(wrapper.text()).toContain('Komponente Nope fehlt.')
    wrapper.unmount()
  })

  it('translates the breadcrumb landmark', () => {
    panel.translations.breadcrumbs = 'Brotkrümel'

    const wrapper = mountWithAlfakit(() =>
      h(Breadcrumbs, { items: [{ label: 'Posts', url: '/posts' }] }),
    )

    expect(wrapper.find('nav').attributes('aria-label')).toBe('Brotkrümel')
    wrapper.unmount()
  })
})
