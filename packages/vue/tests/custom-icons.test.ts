import { setIconAliases } from '@alfakit/core'
import { XIcon } from '@lucide/vue'
import { flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'
import Dialog from '../src/components/ui/Dialog.vue'
import DialogContent from '../src/components/ui/DialogContent.vue'
import DialogTitle from '../src/components/ui/DialogTitle.vue'
import Icon from '../src/lib/Icon.vue'

describe('Icon sources', () => {
  afterEach(() => setIconAliases(null))

  it('renders server-sanitised SVG markup inline', () => {
    const wrapper = mount(Icon, {
      props: {
        name: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24"/></svg>',
      },
    })

    const span = wrapper.find('[data-slot="icon"]')
    expect(span.element.tagName).toBe('SPAN')
    expect(span.attributes('aria-hidden')).toBe('true')
    expect(span.find('svg path').exists()).toBe(true)
  })

  it('renders image URLs as decorative images', () => {
    const wrapper = mount(Icon, { props: { name: '/icons/brand.svg', class: 'size-6' } })

    const image = wrapper.find('img')
    expect(image.attributes('src')).toBe('/icons/brand.svg')
    expect(image.attributes('alt')).toBe('')
    expect(image.classes()).toContain('size-6')
  })

  it('uses the replacement of an alfakit:: alias', () => {
    setIconAliases({ 'alfakit::tables.search-field': 'https://cdn.test/search.svg' })

    const wrapper = mount(Icon, {
      props: { name: 'alfakit::tables.search-field', fallback: 'search' },
    })

    expect(wrapper.find('img').attributes('src')).toBe('https://cdn.test/search.svg')
  })
})

describe('Chrome icon aliases', () => {
  afterEach(() => {
    setIconAliases(null)
    document.body.innerHTML = ''
  })

  it('draws the bundled glyph synchronously when the alias is not replaced', () => {
    const wrapper = mount(Icon, {
      props: { name: 'alfakit::support.modal.close-button', fallback: XIcon, class: 'size-5' },
    })

    const svg = wrapper.find('svg')
    expect(svg.exists()).toBe(true)
    expect(svg.classes()).toContain('lucide-x')
    expect(svg.classes()).toContain('size-5')
  })

  it('renders the app replacement of a chrome alias', () => {
    setIconAliases({ 'alfakit::support.modal.close-button': '/icons/close.svg' })

    const wrapper = mount(Icon, {
      props: { name: 'alfakit::support.modal.close-button', fallback: XIcon },
    })

    expect(wrapper.find('svg').exists()).toBe(false)
    expect(wrapper.find('img').attributes('src')).toBe('/icons/close.svg')
  })

  it('uses the replacement for the dialog close button', async () => {
    setIconAliases({ 'alfakit::support.modal.close-button': '/icons/close.svg' })

    mount(
      () =>
        h(Dialog, { open: true }, () =>
          h(DialogContent, null, () => h(DialogTitle, null, () => 'Title')),
        ),
      { attachTo: document.body },
    )
    await flushPromises()

    const close = document.body.querySelector('[data-slot="dialog-close"]')
    expect(close).not.toBeNull()
    expect(close?.querySelector('img')?.getAttribute('src')).toBe('/icons/close.svg')
    expect(close?.querySelector('svg')).toBeNull()
  })
})
