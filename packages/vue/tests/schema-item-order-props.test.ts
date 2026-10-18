import type { SchemaComponent } from '@alfakit/core'
import { defineComponent, h } from 'vue'
import RenderComponent from '../src/components/schema/RenderComponent.vue'
import { mountWithAlfakit, registry } from './mocks'

describe('schema items', () => {
  it('applies columnOrder() classes to the grid item', () => {
    const component = {
      type: 'Text',
      key: 'a',
      content: 'A',
      columnOrder: { default: 2, lg: 1 },
    } as unknown as SchemaComponent
    const wrapper = mountWithAlfakit(() => h(RenderComponent, { component }))

    const item = wrapper.find('[data-slot="schema-item"]')
    expect(item.classes()).toContain('order-2')
    expect(item.classes()).toContain('lg:order-1')
    wrapper.unmount()
  })

  it('spreads the PHP props into registered View components', () => {
    registry.register(
      'price-badge',
      defineComponent({
        props: ['amount'],
        setup: (props) => () => h('span', `Price ${props.amount}`),
      }),
    )
    const component = {
      type: 'View',
      key: 'v',
      component: 'price-badge',
      props: { amount: 42 },
    } as unknown as SchemaComponent
    const wrapper = mountWithAlfakit(() => h(RenderComponent, { component }))

    expect(wrapper.text()).toContain('Price 42')
    wrapper.unmount()
  })
})
