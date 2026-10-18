import { setIconAliases } from '@alfakit/core'
import { XIcon } from '@lucide/svelte'
import { render } from '@testing-library/svelte'
import BreadcrumbSeparator from '../src/components/ui/breadcrumb/BreadcrumbSeparator.svelte'
import Icon from '../src/lib/Icon.svelte'

describe('Icon sources', () => {
  afterEach(() => setIconAliases(null))

  it('renders server-sanitised SVG markup inline', () => {
    const { container } = render(Icon, {
      props: {
        name: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24"/></svg>',
      },
    })

    const wrapper = container.querySelector('[data-slot="icon"]')!
    expect(wrapper.tagName).toBe('SPAN')
    expect(wrapper.getAttribute('aria-hidden')).toBe('true')
    expect(wrapper.querySelector('svg path')).not.toBeNull()
  })

  it('renders image URLs as decorative images', () => {
    const { container } = render(Icon, { props: { name: '/icons/brand.svg', class: 'size-6' } })

    const image = container.querySelector('img')!
    expect(image.getAttribute('src')).toBe('/icons/brand.svg')
    expect(image.getAttribute('alt')).toBe('')
    expect(image.getAttribute('class')).toContain('size-6')
  })

  it('uses the replacement of an alfakit:: alias', () => {
    setIconAliases({ 'alfakit::tables.search-field': 'https://cdn.test/search.svg' })

    const { container } = render(Icon, {
      props: { name: 'alfakit::tables.search-field', fallback: 'search' },
    })

    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://cdn.test/search.svg')
  })
})

describe('Chrome icon aliases', () => {
  afterEach(() => setIconAliases(null))

  it('draws the statically imported glyph for an unreplaced alias', () => {
    const { container } = render(Icon, {
      props: { name: 'alfakit::support.modal.close-button', fallback: XIcon, class: 'size-5' },
    })

    const svg = container.querySelector('svg')!
    expect(svg).not.toBeNull()
    expect(svg.getAttribute('class')).toContain('lucide-x')
    expect(svg.getAttribute('class')).toContain('size-5')
    expect(container.querySelector('img')).toBeNull()
  })

  it('renders the app replacement of the alias instead of the glyph', () => {
    setIconAliases({ 'alfakit::support.modal.close-button': '/icons/close.svg' })

    const { container } = render(Icon, {
      props: { name: 'alfakit::support.modal.close-button', fallback: XIcon },
    })

    expect(container.querySelector('img')?.getAttribute('src')).toBe('/icons/close.svg')
    expect(container.querySelector('svg')).toBeNull()
  })

  it('lets chrome components pick up the replacement', () => {
    const { container, unmount } = render(BreadcrumbSeparator)
    expect(container.querySelector('svg')?.getAttribute('class')).toContain('lucide-chevron-right')
    unmount()

    setIconAliases({ 'alfakit::support.breadcrumbs.separator': '/icons/slash.svg' })
    const replaced = render(BreadcrumbSeparator)

    expect(replaced.container.querySelector('img')?.getAttribute('src')).toBe('/icons/slash.svg')
  })
})
