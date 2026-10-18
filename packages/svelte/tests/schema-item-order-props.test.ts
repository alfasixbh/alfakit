import type { SchemaComponent } from '@alfakit/core'
import { render } from '@testing-library/svelte'
import RenderComponent from '../src/components/schema/RenderComponent.svelte'
import { registry } from './mocks'
import PriceBadge from './PriceBadge.svelte'
import Wrapper from './Wrapper.svelte'

describe('schema items', () => {
  it('applies columnOrder() classes to the grid item', () => {
    const component = {
      type: 'Text',
      key: 'a',
      content: 'A',
      columnOrder: { default: 2, lg: 1 },
    } as unknown as SchemaComponent
    const { container } = render(Wrapper, {
      props: { component: RenderComponent, props: { component } },
    })

    const item = container.querySelector('[data-slot="schema-item"]')
    expect(item?.className).toContain('order-2')
    expect(item?.className).toContain('lg:order-1')
  })

  it('spreads the PHP props into registered View components', () => {
    registry.register('price-badge', PriceBadge)
    const component = {
      type: 'View',
      key: 'v',
      component: 'price-badge',
      props: { amount: 42 },
    } as unknown as SchemaComponent
    const { container } = render(Wrapper, {
      props: { component: RenderComponent, props: { component } },
    })

    expect(container.textContent).toContain('Price 42')
  })
})
