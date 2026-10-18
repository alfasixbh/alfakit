import { getScriptData, loadScript, loadStyle } from '../src/assets'
import { iconAlias, iconAliasOverride, iconSource, isIconAlias, setIconAliases } from '../src/icons'
import { applyPanelTheme } from '../src/theme'

describe('iconSource', () => {
  it('tells names, URLs and SVG markup apart', () => {
    expect(iconSource('users')).toEqual({ type: 'name', name: 'users' })
    expect(iconSource('https://cdn.test/x.svg')).toEqual({
      type: 'url',
      url: 'https://cdn.test/x.svg',
    })
    expect(iconSource('/icons/x.svg')).toEqual({ type: 'url', url: '/icons/x.svg' })
    expect(iconSource('data:image/svg+xml;base64,AAAA').type).toBe('url')
    expect(iconSource('<svg viewBox="0 0 24 24"></svg>')).toEqual({
      type: 'svg',
      svg: '<svg viewBox="0 0 24 24"></svg>',
    })
  })

  it('keeps javascript: values as plain names', () => {
    expect(iconSource('javascript:alert(1)').type).toBe('name')
  })
})

describe('iconAlias', () => {
  afterEach(() => setIconAliases(null))

  it('falls back to the renderer icon until the app replaces the alias', () => {
    expect(iconAlias('alfakit::panels.sidebar.collapse-button', 'chevron-left')).toBe(
      'chevron-left',
    )

    setIconAliases({ 'alfakit::panels.sidebar.collapse-button': 'arrow-left' })

    expect(iconAlias('alfakit::panels.sidebar.collapse-button', 'chevron-left')).toBe('arrow-left')
    expect(iconAlias('users', 'x')).toBe('users')
    expect(isIconAlias('alfakit::x')).toBe(true)
    expect(isIconAlias('users')).toBe(false)
  })

  it('reports only replaced aliases as overrides', () => {
    expect(iconAliasOverride('alfakit::support.modal.close-button')).toBeUndefined()

    setIconAliases({ 'alfakit::support.modal.close-button': 'circle-x' })

    expect(iconAliasOverride('alfakit::support.modal.close-button')).toBe('circle-x')
    expect(iconAliasOverride('users')).toBeUndefined()
  })

  it('is fed by applyPanelTheme', () => {
    applyPanelTheme({
      id: 'admin',
      colors: {},
      theme: {
        name: 'alfakit',
        attribute: 'alfakit',
        sidebar: 'inset',
        density: 'comfortable',
        design: {} as never,
        icons: { 'alfakit::tables.search-field': 'scan-search' },
      },
    })

    expect(iconAlias('alfakit::tables.search-field', 'search')).toBe('scan-search')
  })
})

describe('assets', () => {
  afterEach(() => {
    document.head.innerHTML = ''
    delete window.alfakitData
  })

  it('adds a stylesheet once and resolves when it loads', async () => {
    const first = loadStyle('/vendor/alfakit/acme/blog/blog.css')
    const second = loadStyle('/vendor/alfakit/acme/blog/blog.css')

    const links = document.head.querySelectorAll('link[rel="stylesheet"]')
    expect(links).toHaveLength(1)
    expect(first).toBe(second)

    links[0]!.dispatchEvent(new Event('load'))
    await expect(first).resolves.toBeUndefined()
  })

  it('adds module scripts and rejects when they fail', async () => {
    const promise = loadScript('/x.js', { module: true })
    const script = document.head.querySelector('script')!

    expect(script.type).toBe('module')
    script.dispatchEvent(new Event('error'))

    await expect(promise).rejects.toThrow('/x.js')
    expect(document.head.querySelector('script')).toBeNull()
  })

  it('ignores missing URLs', async () => {
    await expect(loadStyle(null)).resolves.toBeUndefined()
    expect(document.head.children).toHaveLength(0)
  })

  it('reads registered script data', () => {
    expect(getScriptData()).toEqual({})

    window.alfakitData = { blog: { perPage: 10 } }

    expect(getScriptData<{ perPage: number }>('blog')?.perPage).toBe(10)
    expect(getScriptData('missing')).toBeUndefined()
  })
})
