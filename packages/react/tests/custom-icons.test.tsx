import { setIconAliases } from '@alfakit/core'
import { render } from '@testing-library/react'
import { XIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '../src/components/ui/dialog'
import { Icon } from '../src/lib/icons'

describe('Icon sources', () => {
  afterEach(() => setIconAliases(null))

  it('renders server-sanitised SVG markup inline', () => {
    const { container } = render(
      <Icon
        name={
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24"/></svg>'
        }
      />,
    )

    const wrapper = container.querySelector('[data-slot="icon"]')!
    expect(wrapper.tagName).toBe('SPAN')
    expect(wrapper.getAttribute('aria-hidden')).toBe('true')
    expect(wrapper.querySelector('svg path')).not.toBeNull()
  })

  it('renders image URLs as decorative images', () => {
    const { container } = render(<Icon name="https://cdn.test/brand.svg" className="size-6" />)

    const image = container.querySelector('img')!
    expect(image.getAttribute('src')).toBe('https://cdn.test/brand.svg')
    expect(image.getAttribute('alt')).toBe('')
    expect(image.className).toContain('size-6')
  })

  it('uses the replacement of an alfakit:: alias', () => {
    setIconAliases({ 'alfakit::tables.search-field': 'https://cdn.test/search.svg' })

    const { container } = render(<Icon name="alfakit::tables.search-field" fallback="search" />)

    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://cdn.test/search.svg')
  })
})

describe('Chrome icon aliases', () => {
  afterEach(() => setIconAliases(null))

  it('draws the bundled glyph synchronously until the alias is replaced', () => {
    const { container } = render(
      <Icon name="alfakit::support.modal.close-button" fallback={XIcon} className="size-5" />,
    )

    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('class')).toContain('lucide-x')
    expect(svg.getAttribute('class')).toContain('size-5')
  })

  it('uses the replacement registered with Icons::register()', () => {
    setIconAliases({ 'alfakit::support.modal.close-button': '/icons/close.svg' })

    const { container } = render(
      <Icon name="alfakit::support.modal.close-button" fallback={XIcon} />,
    )

    expect(container.querySelector('img')?.getAttribute('src')).toBe('/icons/close.svg')
    expect(container.querySelector('.lucide-x')).toBeNull()
  })

  it('routes the dialog close button through the alias', () => {
    setIconAliases({ 'alfakit::support.modal.close-button': '/icons/close.svg' })

    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
        </DialogContent>
      </Dialog>,
    )

    expect(document.querySelector('[data-slot="dialog-close"] img')?.getAttribute('src')).toBe(
      '/icons/close.svg',
    )
  })
})
