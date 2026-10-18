import { describe, expect, it } from 'vitest'
import { applyPanelFavicon } from '../src/theme'

describe('applyPanelFavicon', () => {
  it('updates, adds and removes the panel favicon link', () => {
    applyPanelFavicon('/a.png')
    expect(document.querySelector('link[rel="icon"]')?.getAttribute('href')).toBe('/a.png')

    applyPanelFavicon('/b.png')
    expect(document.querySelectorAll('link[rel="icon"]')).toHaveLength(1)
    expect(document.querySelector('link[rel="icon"]')?.getAttribute('href')).toBe('/b.png')

    applyPanelFavicon(null)
    expect(document.querySelector('link[rel="icon"]')).toBeNull()
  })
})
