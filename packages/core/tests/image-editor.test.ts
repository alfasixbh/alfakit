import { describe, expect, it } from 'vitest'
import {
  canEditImage,
  canEditImageName,
  editableImageName,
  fetchEditableImage,
  filesFromClipboard,
  ImageEditor,
} from '../src/image-editor'

describe('ImageEditor', () => {
  it('starts with the largest centred crop of the first ratio', () => {
    const editor = new ImageEditor({ width: 400, height: 200, aspectRatios: ['1:1', null] })

    expect(editor.state.aspectRatio).toBe('1:1')
    expect(editor.state.crop).toEqual({ x: 100, y: 0, width: 200, height: 200 })
    expect(editor.cropBox()).toEqual({ left: 25, top: 0, width: 50, height: 100 })
  })

  it('crops freely without ratios and forces 1:1 for circles', () => {
    expect(new ImageEditor({ width: 400, height: 200 }).state.crop).toEqual({
      x: 0,
      y: 0,
      width: 400,
      height: 200,
    })

    const circle = new ImageEditor({
      width: 400,
      height: 200,
      aspectRatios: ['16:9'],
      circle: true,
    })

    expect(circle.aspectRatios).toEqual(['1:1'])
    expect(circle.state.crop.width).toBe(circle.state.crop.height)
  })

  it('switches aspect ratios', () => {
    const editor = new ImageEditor({ width: 1600, height: 900, aspectRatios: [null, '16:9'] })
    editor.setAspectRatio('4:3')

    expect(editor.state.crop).toEqual({ x: 200, y: 0, width: 1200, height: 900 })
  })

  it('rotates by quarter turns, swapping the size', () => {
    const editor = new ImageEditor({ width: 400, height: 200 })
    editor.rotate(1)

    expect(editor.state).toMatchObject({ rotation: 90, width: 200, height: 400 })

    editor.rotate(-1)
    editor.rotate(-1)

    expect(editor.state).toMatchObject({ rotation: 270, width: 200, height: 400 })

    editor.reset()

    expect(editor.state).toMatchObject({ rotation: 0, width: 400, height: 200 })
  })

  it('mirrors the crop box when flipping', () => {
    const editor = new ImageEditor({ width: 400, height: 200, aspectRatios: ['1:1'] })
    editor.moveBy(-100, 0)
    editor.flip('x')

    expect(editor.state.flipX).toBe(true)
    expect(editor.state.crop.x).toBe(200)
  })

  it('keeps the crop box inside the image when moving', () => {
    const editor = new ImageEditor({ width: 400, height: 200, aspectRatios: ['1:1'] })
    editor.moveBy(1000, 1000)

    expect(editor.state.crop).toMatchObject({ x: 200, y: 0 })
  })

  it('drags corners keeping the ratio and the opposite corner', () => {
    const editor = new ImageEditor({ width: 400, height: 400, aspectRatios: ['2:1'] })
    // 400×200 centred at y=100. Drag the bottom-right corner 100px left.
    editor.startDrag('se', 500, 500, 0.5)
    editor.dragTo(450, 500)
    editor.endDrag()

    expect(editor.state.crop).toEqual({ x: 0, y: 100, width: 300, height: 150 })
    expect(editor.dragging).toBe(false)

    // The top-left corner cannot leave the image.
    editor.resizeBy('nw', -1000, 0)
    expect(editor.state.crop.x).toBeGreaterThanOrEqual(0)
    expect(editor.state.crop.width / editor.state.crop.height).toBeCloseTo(2)
  })

  it('drags the whole box relative to where the drag started', () => {
    const editor = new ImageEditor({ width: 400, height: 200, aspectRatios: ['1:1'] })
    editor.startDrag('move', 0, 0, 2)
    editor.dragTo(-40, 0)
    editor.dragTo(-80, 0)

    expect(editor.state.crop.x).toBe(60)
  })

  it('moves and resizes with the keyboard', () => {
    const editor = new ImageEditor({ width: 500, height: 500 })
    editor.setAspectRatio('1:1')
    editor.resizeBy('se', -100, -100)

    expect(editor.handleKey({ key: 'ArrowRight', shiftKey: false })).toBe(true)
    expect(editor.state.crop.x).toBe(10)
    expect(editor.handleKey({ key: 'ArrowDown', shiftKey: true })).toBe(true)
    expect(editor.state.crop.height).toBe(410)
    expect(editor.handleKey({ key: 'Enter', shiftKey: false })).toBe(false)
  })

  it('keeps mode 1 crops inside the image and reports where the image sits', () => {
    const editor = new ImageEditor({ width: 400, height: 200, mode: 1 })

    expect(editor.state).toMatchObject({ width: 400, height: 200 })
    expect(editor.state.image).toEqual({ x: 0, y: 0, width: 400, height: 200 })
  })

  it('lets mode 0 crops take in empty space around the image', () => {
    const editor = new ImageEditor({ width: 400, height: 200, mode: 0, aspectRatios: ['1:1'] })

    // A 400×400 editing area with the image centred vertically.
    expect(editor.state).toMatchObject({ width: 400, height: 400 })
    expect(editor.state.image).toEqual({ x: 0, y: 100, width: 400, height: 200 })
    // The crop starts fitted inside the image…
    expect(editor.state.crop).toEqual({ x: 100, y: 100, width: 200, height: 200 })

    // …and can grow past it, up to the editing area.
    editor.resizeBy('se', 1000, 1000)
    expect(editor.state.crop).toEqual({ x: 100, y: 100, width: 300, height: 300 })
    editor.moveBy(-1000, -1000)
    expect(editor.state.crop).toMatchObject({ x: 0, y: 0 })

    editor.rotate(1)
    expect(editor.state.image).toEqual({ x: 100, y: 0, width: 200, height: 400 })
  })

  it('opens with the viewport ratio, except for circles', () => {
    const editor = new ImageEditor({
      width: 1600,
      height: 1600,
      aspectRatios: [null, '1:1'],
      viewportWidth: 1920,
      viewportHeight: 1080,
    })

    expect(editor.state.aspectRatio).toBe('1920:1080')
    expect(editor.state.crop).toEqual({ x: 0, y: 350, width: 1600, height: 900 })

    const circle = new ImageEditor({
      width: 100,
      height: 100,
      circle: true,
      viewportWidth: 16,
      viewportHeight: 9,
    })

    expect(circle.state.aspectRatio).toBe('1:1')
  })

  it('fills the empty space around the image only', () => {
    const editor = new ImageEditor({ width: 400, height: 200, mode: 0, emptyFillColor: '#000' })
    const calls: string[] = []
    const context = {
      save: () => calls.push('save'),
      restore: () => calls.push('restore'),
      fillRect: (...args: number[]) => calls.push(`fill:${args.join(',')}`),
      clearRect: (...args: number[]) => calls.push(`clear:${args.join(',')}`),
      scale: () => {},
      translate: () => {},
      rotate: () => {},
      drawImage: () => calls.push('draw'),
      set fillStyle(value: string) {
        calls.push(`style:${value}`)
      },
    }
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => context,
    } as unknown as HTMLCanvasElement

    editor.drawPreview(canvas, {} as CanvasImageSource)

    expect(calls).toContain('style:#000')
    expect(calls).toContain('fill:0,0,400,400')
    expect(calls).toContain('clear:0,100,400,200')
    expect(calls.indexOf('clear:0,100,400,200')).toBeLessThan(calls.indexOf('draw'))

    // Without empty space there is nothing to fill.
    const inside = new ImageEditor({ width: 400, height: 200, emptyFillColor: '#000' })
    calls.length = 0
    inside.drawPreview(canvas, {} as CanvasImageSource)
    expect(calls.some((call) => call.startsWith('fill:'))).toBe(false)
  })

  it('opens raster images only', () => {
    expect(canEditImage({ type: 'image/jpeg' })).toBe(true)
    expect(canEditImage({ type: 'image/svg+xml' })).toBe(false)
    expect(canEditImage({ type: 'image/gif' })).toBe(false)
  })
})

describe('ImageEditor zoom', () => {
  it('zooms the image under a crop box that stays put on screen', () => {
    const editor = new ImageEditor({ width: 400, height: 200 })
    editor.zoomTo(2)

    expect(editor.state.zoom).toBe(2)
    expect(editor.displayScale).toBe(2)
    // Same place on screen, half the image pixels.
    expect(editor.state.crop).toEqual({ x: 100, y: 50, width: 200, height: 100 })
    expect(editor.cropBox()).toEqual({ left: 0, top: 0, width: 100, height: 100 })
  })

  it('zooms around a pivot in container pixels', () => {
    const editor = new ImageEditor({ width: 400, height: 200 })
    editor.zoomTo(2, { x: 0, y: 0 })

    expect(editor.state.center).toEqual({ x: 100, y: 50 })
    expect(editor.state.crop).toEqual({ x: 0, y: 0, width: 200, height: 100 })
  })

  it('zooms in steps with buttons, keys, the wheel and a trackpad pinch', () => {
    const editor = new ImageEditor({ width: 400, height: 200 })

    editor.zoomIn()
    expect(editor.state.zoom).toBeCloseTo(1.2)
    expect(editor.handleKey({ key: '+', shiftKey: false })).toBe(true)
    expect(editor.state.zoom).toBeCloseTo(1.44)
    expect(editor.handleKey({ key: '-', shiftKey: false })).toBe(true)
    editor.zoomOut()
    expect(editor.state.zoom).toBeCloseTo(1)

    expect(editor.wheel({ deltaY: -100, ctrlKey: false })).toBe(true)
    expect(editor.state.zoom).toBeCloseTo(Math.exp(0.2))
    // A pinch arrives as a ctrl+wheel with small deltas, zooming faster per unit.
    editor.zoomTo(1)
    editor.wheel({ deltaY: -10, ctrlKey: true })
    expect(editor.state.zoom).toBeCloseTo(Math.exp(0.1))
  })

  it('pinches with two pointers', () => {
    const editor = new ImageEditor({ width: 400, height: 200 })
    editor.startDrag('move', 0, 0, undefined, 1)
    editor.startDrag('move', 100, 0, undefined, 2)
    editor.dragTo(200, 0, 2)

    expect(editor.dragging).toBe(true)
    expect(editor.state.zoom).toBeCloseTo(2)

    editor.endDrag(2)
    expect(editor.dragging).toBe(false)
    // Moving the remaining pointer no longer zooms or drags.
    editor.dragTo(500, 0, 2)
    expect(editor.state.zoom).toBeCloseTo(2)
  })

  it('limits zooming out by mode, like Cropper.js view modes', () => {
    const make = (mode: 0 | 1 | 2 | 3) => {
      const editor = new ImageEditor({ width: 400, height: 200, mode })
      editor.setContainer(400, 400)

      return editor
    }

    // 0 and 1: the image can be smaller than the container.
    for (const mode of [0, 1] as const) {
      const editor = make(mode)
      editor.zoomTo(0.5)
      expect(editor.state.zoom).toBe(0.5)
    }

    // 2: the image can't be smaller than fitting the container.
    const fits = make(2)
    expect(fits.state.zoom).toBe(1)
    expect(fits.canZoomOut).toBe(false)
    fits.zoomTo(0.5)
    expect(fits.state.zoom).toBe(1)

    // 3: the image always fills the container (400×200 into 400×400 needs 2×).
    const fills = make(3)
    expect(fills.state.zoom).toBe(2)
    expect(fills.zoomLimits.min).toBe(2)
    fills.zoomOut()
    expect(fills.state.zoom).toBe(2)
    // The crop is kept on screen: the visible part of the image is x 100–300.
    expect(fills.state.crop).toEqual({ x: 100, y: 0, width: 200, height: 200 })
    expect(fills.cropBox()).toEqual({ left: 0, top: 0, width: 100, height: 100 })
  })

  it('pans the image under the crop box, within the mode limits', () => {
    const editor = new ImageEditor({ width: 400, height: 200, mode: 3 })
    editor.setContainer(400, 400)

    // Drag the image left: the camera moves right until the image edge meets the container.
    editor.startDrag('pan', 0, 0)
    editor.dragTo(-1000, -1000)
    editor.endDrag()

    expect(editor.state.center).toEqual({ x: 300, y: 100 })
    expect(editor.state.crop).toEqual({ x: 200, y: 0, width: 200, height: 200 })
  })

  it('keeps mode 1 crops inside the image and on screen when zoomed', () => {
    const editor = new ImageEditor({ width: 400, height: 200, aspectRatios: ['1:1'] })
    editor.zoomTo(2)
    editor.moveBy(1000, 1000)

    // Visible: x 100–300, y 50–150.
    const { crop } = editor.state
    expect(crop.x + crop.width).toBeCloseTo(300)
    expect(crop.y + crop.height).toBeCloseTo(150)
  })

  it('resets the zoom when rotating', () => {
    const editor = new ImageEditor({ width: 400, height: 200 })
    editor.zoomTo(3)
    editor.rotate(1)

    expect(editor.state.zoom).toBe(1)
    expect(editor.state.center).toEqual({ x: 100, y: 200 })
  })

  it('draws the camera view at the container size', () => {
    const editor = new ImageEditor({ width: 400, height: 200 })
    editor.setContainer(200, 100)
    const transforms: string[] = []
    const context = {
      save: () => {},
      restore: () => {},
      clearRect: () => {},
      scale: (x: number, y: number) => transforms.push(`scale:${x},${y}`),
      translate: (x: number, y: number) => transforms.push(`translate:${x},${y}`),
      rotate: () => {},
      drawImage: () => transforms.push('draw'),
    }
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => context,
    } as unknown as HTMLCanvasElement

    editor.drawPreview(canvas, {} as CanvasImageSource, 2)

    expect([canvas.width, canvas.height]).toEqual([400, 200])
    expect(transforms.slice(0, 4)).toEqual([
      'scale:2,2',
      'translate:100,50',
      'scale:0.5,0.5',
      'translate:-200,-100',
    ])
  })
})

describe('ImageEditor numeric inputs', () => {
  it('reads and writes the crop in image pixels', () => {
    const editor = new ImageEditor({ width: 400, height: 200 })
    editor.setData({ x: 50, y: 20, width: 100, height: 80 })

    expect(editor.getData()).toEqual({
      x: 50,
      y: 20,
      width: 100,
      height: 80,
      rotate: 0,
      scaleX: 1,
      scaleY: 1,
    })
  })

  it('clamps values to the image and ignores non-numbers', () => {
    const editor = new ImageEditor({ width: 400, height: 200 })
    editor.setData({ x: 50, y: 20, width: 100, height: 80 })
    editor.setData({ width: 1000 })

    expect(editor.getData()).toMatchObject({ x: 0, y: 20, width: 400, height: 80 })

    editor.setData({ x: Number.NaN, height: Number.POSITIVE_INFINITY })
    expect(editor.getData()).toMatchObject({ x: 0, width: 400, height: 80 })

    editor.setData({ width: -5 })
    expect(editor.getData().width).toBe(10)
  })

  it('keeps the aspect ratio: width sets height and height sets width', () => {
    const editor = new ImageEditor({ width: 400, height: 200, aspectRatios: ['1:1'] })
    editor.setData({ width: 100 })

    expect(editor.getData()).toMatchObject({ width: 100, height: 100 })

    editor.setData({ height: 50 })
    expect(editor.getData()).toMatchObject({ width: 50, height: 50 })
  })

  it('rotates to any angle and flips through the scales', () => {
    const editor = new ImageEditor({ width: 100, height: 100 })
    editor.setData({ rotate: 45 })

    expect(editor.state.rotation).toBe(45)
    expect(editor.state.width).toBeCloseTo(141.42, 1)
    expect(editor.getData().rotate).toBe(45)

    editor.setData({ rotate: -90 })
    expect(editor.state.rotation).toBe(270)

    editor.setData({ scaleX: -1, scaleY: 1 })
    expect(editor.state).toMatchObject({ flipX: true, flipY: false })
    expect(editor.getData()).toMatchObject({ scaleX: -1, scaleY: 1 })

    // The rotate buttons snap a tilted image to the next quarter turn.
    editor.setRotation(45)
    editor.rotate(1)
    expect(editor.state.rotation).toBe(90)
  })

  it('measures from the image in mode 0, so values can be negative', () => {
    const editor = new ImageEditor({ width: 400, height: 200, mode: 0, aspectRatios: ['1:1'] })

    expect(editor.getData()).toMatchObject({ x: 100, y: 0, width: 200, height: 200 })

    editor.setData({ y: -100 })
    expect(editor.getData().y).toBe(-100)
  })

  it('brings a crop typed outside the view back on screen', () => {
    const editor = new ImageEditor({ width: 400, height: 200 })
    editor.zoomTo(2)
    editor.setData({ x: 0, y: 0, width: 400, height: 200 })

    expect(editor.state.zoom).toBe(1)
    expect(editor.state.crop).toEqual({ x: 0, y: 0, width: 400, height: 200 })
  })
})

describe('editing uploaded images', () => {
  const respond = (body: Blob, ok = true) =>
    (async () => ({ ok, blob: async () => body }) as Response) as unknown as typeof fetch

  it('recognises editable image names', () => {
    expect(canEditImageName('photo.JPG')).toBe(true)
    expect(canEditImageName('avatars/a.webp')).toBe(true)
    expect(canEditImageName('logo.svg')).toBe(false)
    expect(canEditImageName('document')).toBe(false)

    expect(editableImageName({ name: 'Holiday', path: 'photos/abc.jpg' })).toBe('abc.jpg')
    expect(editableImageName({ name: 'a.png', path: 'tmp:xyz' })).toBe('a.png')
    expect(editableImageName({ name: 'notes', path: 'docs/notes.pdf' })).toBeNull()
  })

  it('fetches a stored image as a file for the editor', async () => {
    const png = await fetchEditableImage(
      '/storage/a.png',
      'a.png',
      respond(new Blob(['x'], { type: 'image/png' })),
    )

    expect(png).toBeInstanceOf(File)
    expect(png).toMatchObject({ name: 'a.png', type: 'image/png' })

    // An untyped response is typed from the name.
    const jpeg = await fetchEditableImage('/f', 'b.jpg', respond(new Blob(['x'])))
    expect(jpeg?.type).toBe('image/jpeg')
  })

  it('resolves null for failures and non-editable files', async () => {
    expect(await fetchEditableImage('/f', 'a.png', respond(new Blob(['x']), false))).toBeNull()
    expect(
      await fetchEditableImage('/f', 'a.svg', respond(new Blob(['x'], { type: 'image/svg+xml' }))),
    ).toBeNull()

    const failing = (async () => {
      throw new TypeError('Failed to fetch')
    }) as unknown as typeof fetch
    expect(await fetchEditableImage('/f', 'a.png', failing)).toBeNull()
  })
})

describe('filesFromClipboard', () => {
  it('reads pasted files and file items', () => {
    const file = new File(['x'], 'shot.png', { type: 'image/png' })

    expect(filesFromClipboard(null)).toEqual([])
    expect(filesFromClipboard({ files: [file], items: [] } as unknown as DataTransfer)).toEqual([
      file,
    ])
    expect(
      filesFromClipboard({
        files: [],
        items: [
          { kind: 'string', getAsFile: () => null },
          { kind: 'file', getAsFile: () => file },
        ],
      } as unknown as DataTransfer),
    ).toEqual([file])
  })
})
