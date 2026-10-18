import type { SchemaComponent } from '@alfakit/core'
import { render } from '@testing-library/react'
import { RenderComponent } from '../src/components/schema/schema-renderer'
import { registry, Wrapper } from './mocks'

describe('schema items', () => {
  it('applies columnOrder() classes to the grid item', () => {
    const { container } = render(
      <Wrapper>
        <RenderComponent
          component={
            {
              type: 'Text',
              key: 'a',
              content: 'A',
              columnOrder: { default: 2, lg: 1 },
            } as unknown as SchemaComponent
          }
        />
      </Wrapper>,
    )

    const item = container.querySelector('[data-slot="schema-item"]')
    expect(item?.className).toContain('order-2')
    expect(item?.className).toContain('lg:order-1')
  })

  it('spreads the PHP props into registered View components', () => {
    registry.register('price-badge', ({ amount }: { amount: number }) => (
      <span>Price {amount}</span>
    ))

    const { container } = render(
      <Wrapper>
        <RenderComponent
          component={
            {
              type: 'View',
              key: 'v',
              component: 'price-badge',
              props: { amount: 42 },
            } as unknown as SchemaComponent
          }
        />
      </Wrapper>,
    )

    expect(container.textContent).toContain('Price 42')
  })
})
