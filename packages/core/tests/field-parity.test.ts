import { describe, expect, it, vi } from 'vitest'
import {
  concurrencyLimiter,
  cssAspectRatio,
  fileUploadAccept,
  insertUploadedFile,
  sliderBehavior,
  sliderBlocksTap,
  sliderBounds,
  sliderDirection,
  sliderFromPrimitive,
  sliderNextValues,
  sliderPercent,
  sliderPips,
  sliderPrimitive,
  sliderShift,
  sliderSnap,
  sliderToPrimitive,
  sliderValueAt,
  startSliderRangeDrag,
  uploadedFileLinks,
} from '../src'

const track = { min: 0, max: 100, step: 1 }
const nonLinear = {
  ...track,
  nonLinearPoints: [
    { percent: 20, value: 50 },
    { percent: 50, value: 75, step: 5 },
  ],
}

describe('file upload helpers', () => {
  it('adds mapped extensions to the accept list', () => {
    expect(
      fileUploadAccept({
        acceptedFileTypes: ['application/vnd.sketchup.skp', 'image/*'],
        mimeTypeMap: { skp: 'application/vnd.sketchup.skp', dwg: 'image/vnd.dwg' },
      }),
    ).toBe('application/vnd.sketchup.skp,image/*,.skp')
    expect(fileUploadAccept({ acceptedFileTypes: undefined })).toBeUndefined()
  })

  it('appends or prepends new uploads within maxFiles', () => {
    expect(insertUploadedFile(['a', 'b'], 'c', {}, 3)).toEqual(['a', 'b', 'c'])
    expect(insertUploadedFile(['a', 'b'], 'c', {}, 2)).toEqual(['b', 'c'])
    expect(insertUploadedFile(['a', 'b'], 'c', { appendFiles: false }, 2)).toEqual(['c', 'a'])
  })

  it('turns panel aspect ratios into CSS', () => {
    expect(cssAspectRatio('2:1')).toBe('2 / 1')
    expect(cssAspectRatio('16/9')).toBe('16 / 9')
    expect(cssAspectRatio('nope')).toBeUndefined()
    expect(cssAspectRatio(undefined)).toBeUndefined()
  })

  it('links open and download buttons to their own URLs', () => {
    expect(uploadedFileLinks({ url: '/f' })).toEqual({ open: '/f', download: '/f' })
    expect(uploadedFileLinks({ url: '/f', openUrl: '/o', downloadUrl: '/d' })).toEqual({
      open: '/o',
      download: '/d',
    })
  })

  it('runs at most `limit` tasks at once, in order', async () => {
    const limit = concurrencyLimiter(2)
    const started: number[] = []
    let running = 0
    let peak = 0
    const tasks = [0, 1, 2, 3, 4].map((index) =>
      limit(async () => {
        started.push(index)
        running++
        peak = Math.max(peak, running)
        await new Promise((resolve) => setTimeout(resolve, 5))
        running--

        return index
      }),
    )

    expect(started).toEqual([0, 1])
    expect(await Promise.all(tasks)).toEqual([0, 1, 2, 3, 4])
    expect(started).toEqual([0, 1, 2, 3, 4])
    expect(peak).toBe(2)
  })
})

describe('slider helpers', () => {
  it('uses the server pips when sent', () => {
    expect(
      sliderPips({
        ...track,
        pipList: [
          { value: 0, percent: 0, type: 1 },
          { value: 10, percent: 10, type: 2 },
          { value: 25, percent: 25, type: 0 },
        ],
      }),
    ).toEqual([
      { value: 0, percent: 0, labelled: true },
      { value: 10, percent: 10, labelled: true, small: true },
      { value: 25, percent: 25, labelled: false },
    ])
  })

  it('maps values on non-linear tracks and snaps to section steps', () => {
    expect(sliderPercent(50, nonLinear)).toBe(20)
    expect(sliderPercent(25, nonLinear)).toBe(10)
    expect(sliderValueAt(35, nonLinear, false)).toBe(62.5)
    expect(sliderValueAt(62, nonLinear)).toBe(80)
    expect(sliderSnap(81, nonLinear)).toBe(80)
    expect(sliderPrimitive(nonLinear)).toEqual({ min: 0, max: 100, step: 0.1, nonLinear: true })
    expect(sliderPrimitive(track)).toEqual({ min: 0, max: 100, step: 1, nonLinear: false })
    expect(sliderPrimitive(track, true).step).toBe(0.1)
    expect(sliderToPrimitive([50], nonLinear)).toEqual([20])
    expect(sliderFromPrimitive([62], nonLinear)).toEqual([80])
    expect(sliderToPrimitive([50], track)).toEqual([50])
  })

  it('keeps thumbs inside the padding and stops them at their neighbours', () => {
    const padded = { ...track, rangePadding: [10, 20] as [number, number] }

    expect(sliderBounds(padded)).toEqual([10, 80])
    expect(sliderNextValues([30], [95], padded)).toEqual([80])
    // A thumb dragged past its neighbour stops there (the primitive re-sorted them).
    expect(sliderNextValues([20, 50], [50, 60], track)).toEqual([50, 50])
    expect(sliderNextValues([20, 50], [50, 60], { ...track, minDifference: 5 })).toEqual([45, 50])
    expect(sliderNextValues([20, 50], [50, 60], { ...track, behavior: ['unconstrained'] })).toEqual(
      [50, 60],
    )
    // Fixed: the whole range moves, within the bounds.
    expect(
      sliderNextValues([20, 50], [30, 50], { ...padded, behavior: ['drag', 'fixed'] }),
    ).toEqual([30, 60])
    expect(
      sliderNextValues([20, 50], [60, 50], { ...padded, behavior: ['drag', 'fixed'] }),
    ).toEqual([50, 80])
    expect(sliderShift([20, 50], -50, padded)).toEqual([10, 40])
  })

  it('reads behaviour and direction', () => {
    expect([...sliderBehavior({})]).toEqual(['tap'])
    expect([...sliderBehavior({ behavior: [] })]).toEqual([])
    expect(sliderDirection({}, 'rtl')).toBe('rtl')
    expect(sliderDirection({ rtl: false }, 'rtl')).toBe('ltr')
    expect(sliderDirection({ rtl: true }, 'ltr')).toBe('rtl')
  })

  it('blocks taps on the track when tap is off', () => {
    const track = document.createElement('span')
    const thumb = document.createElement('span')
    thumb.setAttribute('role', 'slider')
    const inner = document.createElement('i')
    thumb.append(inner)

    expect(sliderBlocksTap(track, {})).toBe(false)
    expect(sliderBlocksTap(track, { behavior: [] })).toBe(true)
    expect(sliderBlocksTap(inner, { behavior: [] })).toBe(false)
    expect(sliderBlocksTap(track, { behavior: ['snap'] })).toBe(false)
  })

  it('drags the range between the thumbs', () => {
    const element = document.createElement('div')
    element.getBoundingClientRect = () => ({ width: 200, height: 10 }) as DOMRect
    const onChange = vi.fn()
    const onEnd = vi.fn()
    const down = new PointerEvent('pointerdown', { clientX: 100, cancelable: true })

    startSliderRangeDrag(down, {
      track: element,
      values: [20, 40],
      schema: { ...track, behavior: ['drag'] },
      direction: 'ltr',
      vertical: false,
      onChange,
      onEnd,
    })
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 120 }))
    expect(onChange).toHaveBeenLastCalledWith([30, 50])

    // Right to left: moving right lowers the values; the start of the track stops them.
    window.dispatchEvent(new PointerEvent('pointerup'))
    expect(onEnd).toHaveBeenCalled()

    startSliderRangeDrag(new PointerEvent('pointerdown', { clientX: 100 }), {
      track: element,
      values: [20, 40],
      schema: track,
      direction: 'rtl',
      vertical: false,
      onChange,
    })
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 200 }))
    expect(onChange).toHaveBeenLastCalledWith([0, 20])
    window.dispatchEvent(new PointerEvent('pointerup'))
  })
})
