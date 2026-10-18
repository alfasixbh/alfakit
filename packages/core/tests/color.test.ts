import { colorToHex, formatColor } from '../src/utils/color'

describe('color picker formats', () => {
  it('writes the picked colour in the field format', () => {
    expect(formatColor('#ff8000', 'hex')).toBe('#ff8000')
    expect(formatColor('#ff8000', 'rgb')).toBe('rgb(255, 128, 0)')
    expect(formatColor('#ff8000', 'rgba')).toBe('rgba(255, 128, 0, 1)')
    expect(formatColor('#ff8000', 'rgba', 'rgba(1, 2, 3, 0.5)')).toBe('rgba(255, 128, 0, 0.5)')
    expect(formatColor('#ff0000', 'hsl')).toBe('hsl(0, 100%, 50%)')
    expect(formatColor('#808080', 'hsl')).toBe('hsl(0, 0%, 50%)')
  })

  it('matches the server validation patterns', () => {
    expect(formatColor('#123456', 'rgb')).toMatch(
      /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/i,
    )
    expect(formatColor('#123456', 'rgba')).toMatch(
      /^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(0|1|0?\.\d+)\s*\)$/i,
    )
    expect(formatColor('#123456', 'hsl')).toMatch(
      /^hsl\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%\s*\)$/i,
    )
  })

  it('reads any stored format back into the swatch', () => {
    expect(colorToHex('#abc')).toBe('#aabbcc')
    expect(colorToHex('rgb(255, 128, 0)')).toBe('#ff8000')
    expect(colorToHex('rgba(255, 128, 0, 0.3)')).toBe('#ff8000')
    expect(colorToHex('hsl(0, 100%, 50%)')).toBe('#ff0000')
    expect(colorToHex('not a colour')).toBeNull()
    expect(colorToHex(null)).toBeNull()
  })
})
