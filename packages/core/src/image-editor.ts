import { createStore, type Store } from './store'
import { parseAspectRatio } from './utils/image'

export * from './image-files'

/**
 * The FileUpload image editor (`imageEditor()`): crop, zoom, rotate and flip an image in
 * the browser before it is uploaded (or to replace an uploaded one). The geometry and
 * drawing live here; renderers show a container with the preview canvas (`drawPreview()`),
 * a crop box positioned with `cropBox()` percentages, and call the pointer, wheel and
 * keyboard methods.
 *
 * Three coordinate spaces:
 * - natural: the source image's own pixels (`getData()` / `setData()` are in these,
 *   relative to the image's top-left after rotating and flipping);
 * - editing area ("stage"): the rotated image's bounding box (plus empty space around it
 *   in mode `0`). The crop rectangle is stored here, one unit per image pixel;
 * - container: the CSS pixels of the box the renderer shows (`setContainer()`). A camera
 *   (`zoom` and `center`) maps the editing area onto it.
 *
 * Image space is never mirrored for right-to-left layouts: left is the image's left.
 *
 * Modes follow Cropper.js's `viewMode` (`imageEditorMode()`):
 * - `0`: the crop box may leave the image (the empty space is transparent or
 *   `emptyFillColor`) and the image can be zoomed out below the container size;
 * - `1`: the crop box stays inside the image;
 * - `2`: as `1`, and the image can't be zoomed out below fitting the container;
 * - `3`: as `1`, and the image always fills the container.
 *
 * Zooming keeps the crop box where it is on screen and scales the image under it, so
 * zooming in crops tighter.
 */

/** `imageEditorMode()` values (Cropper.js `viewMode`). */
export type ImageEditorMode = 0 | 1 | 2 | 3

export type CropHandle = 'nw' | 'ne' | 'sw' | 'se'

export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

export interface ImageEditorPoint {
  x: number
  y: number
}

export interface ImageEditorState {
  /** Clockwise, in degrees, `0` up to (not including) `360`. */
  rotation: number
  flipX: boolean
  flipY: boolean
  /** The selected aspect ratio option (`'16:9'`), or null for free cropping. */
  aspectRatio: string | null
  /** Size of the editing area: the rotated image (with room around it in mode `0`). */
  width: number
  height: number
  /** Where the rotated image's bounding box sits in the editing area. */
  image: CropRect
  crop: CropRect
  /** Zoom relative to the editing area fitting the container (`1`). */
  zoom: number
  /** The editing-area point shown at the centre of the container. */
  center: ImageEditorPoint
  /** The container's size in CSS pixels (the editing area's size until it is measured). */
  container: { width: number; height: number }
}

/**
 * The numeric inputs (Cropper.js `getData()`): the crop in natural image pixels relative
 * to the image's top-left, the rotation in degrees and the flips as `1` / `-1` scales.
 */
export interface ImageEditorData {
  x: number
  y: number
  width: number
  height: number
  rotate: number
  scaleX: 1 | -1
  scaleY: 1 | -1
}

export interface ImageEditorOptions {
  /** Natural size of the (EXIF-oriented) source image. */
  width: number
  height: number
  aspectRatios?: Array<string | null>
  circle?: boolean
  /** `imageEditorMode()`; `1` by default. */
  mode?: ImageEditorMode
  /** `imageEditorEmptyFillColor()`: paints the empty space around the image (else transparent). */
  emptyFillColor?: string | null
  /** `imageEditorViewportWidth()/Height()`: the crop ratio the editor opens with. */
  viewportWidth?: number | null
  viewportHeight?: number | null
}

export type ImageEditorDragMode = 'move' | 'pan' | CropHandle

interface DragState {
  mode: ImageEditorDragMode
  startX: number
  startY: number
  /** Displayed pixels per image pixel. */
  scale: number
  crop: CropRect
  center: ImageEditorPoint
}

/** Zoom factor of one step (buttons and `+` / `-`). */
export const IMAGE_EDITOR_ZOOM_STEP = 1.2

/** How far modes `0` and `1` can zoom out (relative to fitting the container). */
const MIN_ZOOM = 0.25

/** How far the image can be zoomed in (relative to fitting the container). */
const MAX_ZOOM = 10

const clamp = (value: number, min: number, max: number) =>
  max < min ? (min + max) / 2 : Math.min(Math.max(value, min), max)

const normalizeAngle = (degrees: number) => {
  // Rounded to drop floating-point noise (`89.99999999`).
  const angle = Math.round((((degrees % 360) + 360) % 360) * 1000) / 1000

  return angle === 360 ? 0 : angle
}

const intersect = (a: CropRect, b: CropRect): CropRect | null => {
  const x = Math.max(a.x, b.x)
  const y = Math.max(a.y, b.y)
  const right = Math.min(a.x + a.width, b.x + b.width)
  const bottom = Math.min(a.y + a.height, b.y + b.height)

  return right > x && bottom > y ? { x, y, width: right - x, height: bottom - y } : null
}

export class ImageEditor {
  public readonly store: Store<ImageEditorState>

  public readonly aspectRatios: Array<string | null>

  public readonly circle: boolean

  public readonly mode: ImageEditorMode

  public readonly emptyFillColor: string | null

  private drag: DragState | null = null

  /** Active pointers (for two-finger pinch zoom), by pointer id. */
  private readonly pointers = new Map<number, ImageEditorPoint>()

  private pinch: { distance: number; zoom: number } | null = null

  /** True once the renderer measured the container (`setContainer()`). */
  private measured = false

  constructor(private readonly options: ImageEditorOptions) {
    this.circle = Boolean(options.circle)
    this.mode = options.mode ?? 1
    this.emptyFillColor = options.emptyFillColor ?? null
    const ratios = this.circle ? ['1:1'] : (options.aspectRatios ?? [null])
    this.aspectRatios = ratios.length > 0 ? ratios : [null]

    const viewport =
      !this.circle && (options.viewportWidth ?? 0) > 0 && (options.viewportHeight ?? 0) > 0
        ? `${options.viewportWidth}:${options.viewportHeight}`
        : null
    const aspectRatio = viewport ?? this.aspectRatios[0] ?? null

    this.store = createStore<ImageEditorState>({
      flipX: false,
      flipY: false,
      aspectRatio,
      ...this.layout(0, parseAspectRatio(aspectRatio), null),
    })
  }

  get state(): ImageEditorState {
    return this.store.get()
  }

  /** The bounding box of the source image turned by `rotation` degrees. */
  private rotatedSize(rotation: number): { width: number; height: number } {
    const { width, height } = this.options

    if (rotation % 180 === 0) return { width, height }
    if (rotation % 90 === 0) return { width: height, height: width }

    const radians = (rotation * Math.PI) / 180
    const cos = Math.abs(Math.cos(radians))
    const sin = Math.abs(Math.sin(radians))

    return { width: width * cos + height * sin, height: width * sin + height * cos }
  }

  /**
   * A fresh layout for `rotation`: the editing area, the camera reset (fitted, or filling
   * the container in mode `3`) and the largest crop with `ratio` fitted inside the image.
   * Mode `0` adds room around the image (a square of its longest side) so the crop box can
   * take in empty space.
   */
  private layout(
    rotation: number,
    ratio: number | null,
    measuredContainer: { width: number; height: number } | null,
  ): Omit<ImageEditorState, 'flipX' | 'flipY' | 'aspectRatio'> {
    const { width, height } = this.rotatedSize(rotation)
    const side = Math.max(width, height)
    const stageWidth = this.mode === 0 ? side : width
    const stageHeight = this.mode === 0 ? side : height
    const image = {
      x: (stageWidth - width) / 2,
      y: (stageHeight - height) / 2,
      width,
      height,
    }
    const container = measuredContainer ?? { width: stageWidth, height: stageHeight }
    const zoom = Math.max(1, this.zoomRange(stageWidth, stageHeight, container).min)
    const center = { x: stageWidth / 2, y: stageHeight / 2 }
    const fitted = ImageEditor.fit(width, height, ratio)
    const crop = { ...fitted, x: fitted.x + image.x, y: fitted.y + image.y }
    const base = {
      rotation,
      width: stageWidth,
      height: stageHeight,
      image,
      zoom,
      center,
      container,
    }

    // Mode 3 can start zoomed in: keep the crop on screen.
    return {
      ...base,
      crop: this.fitCrop(crop, this.limitsOf(base), ratio, 'center'),
    }
  }

  /** The largest centred rectangle with `ratio` (or the whole image). */
  static fit(width: number, height: number, ratio: number | null): CropRect {
    if (!ratio) return { x: 0, y: 0, width, height }

    let cropWidth = width
    let cropHeight = width / ratio

    if (cropHeight > height) {
      cropHeight = height
      cropWidth = height * ratio
    }

    return {
      x: (width - cropWidth) / 2,
      y: (height - cropHeight) / 2,
      width: cropWidth,
      height: cropHeight,
    }
  }

  private get ratio(): number | null {
    return parseAspectRatio(this.state.aspectRatio)
  }

  /** The smallest crop side, in image pixels. */
  private get minSize(): number {
    return Math.max(8, Math.min(this.state.width, this.state.height) * 0.05)
  }

  // ---------------------------------------------------------------------------------------
  // Camera
  // ---------------------------------------------------------------------------------------

  /** Container pixels per editing-area pixel at zoom `1` (the editing area fits). */
  private fitScale(
    width: number,
    height: number,
    container: { width: number; height: number },
  ): number {
    return Math.min(container.width / width, container.height / height)
  }

  /**
   * How far the image can zoom: mode `3` can't go below filling (covering) the container,
   * mode `2` below fitting it; modes `0` and `1` can zoom out to a quarter.
   */
  private zoomRange(
    width: number,
    height: number,
    container: { width: number; height: number },
  ): { min: number; max: number } {
    const fit = this.fitScale(width, height, container)
    const cover = Math.max(container.width / width, container.height / height)
    const min = this.mode === 3 ? cover / fit : this.mode === 2 ? 1 : MIN_ZOOM

    return { min, max: Math.max(min, MAX_ZOOM) }
  }

  /** The current zoom limits (`min`, `max`), for disabling zoom buttons. */
  get zoomLimits(): { min: number; max: number } {
    const { width, height, container } = this.state

    return this.zoomRange(width, height, container)
  }

  get canZoomIn(): boolean {
    return this.state.zoom < this.zoomLimits.max - 1e-9
  }

  get canZoomOut(): boolean {
    return this.state.zoom > this.zoomLimits.min + 1e-9
  }

  /** Container pixels per image pixel (what pointer deltas are divided by). */
  get displayScale(): number {
    const { width, height, container, zoom } = this.state

    return this.fitScale(width, height, container) * zoom
  }

  private scaleOf(state: Pick<ImageEditorState, 'width' | 'height' | 'container' | 'zoom'>) {
    return this.fitScale(state.width, state.height, state.container) * state.zoom
  }

  /** The part of the editing area the container shows. */
  private visibleOf(
    state: Pick<ImageEditorState, 'width' | 'height' | 'container' | 'zoom' | 'center'>,
  ): CropRect {
    const scale = this.scaleOf(state)
    const width = state.container.width / scale
    const height = state.container.height / scale

    return { x: state.center.x - width / 2, y: state.center.y - height / 2, width, height }
  }

  /** Where the crop box may go regardless of the camera: the image, or the whole area in mode `0`. */
  private boundsOf(state: Pick<ImageEditorState, 'width' | 'height' | 'image'>): CropRect {
    return this.mode === 0 ? { x: 0, y: 0, width: state.width, height: state.height } : state.image
  }

  /** Where the crop box may go now: its bounds, on screen. */
  private limitsOf(
    state: Pick<ImageEditorState, 'width' | 'height' | 'container' | 'zoom' | 'center' | 'image'>,
  ): CropRect {
    const bounds = this.boundsOf(state)

    return intersect(bounds, this.visibleOf(state)) ?? bounds
  }

  /**
   * Keep the camera centre where the mode allows: modes `2` and `3` keep the image over
   * the container (covering it on an axis where it's larger, inside it where smaller);
   * modes `0` and `1` only keep some of the image on screen.
   */
  private clampCenter(
    center: ImageEditorPoint,
    state: Pick<ImageEditorState, 'width' | 'height' | 'container'>,
    scale: number,
  ): ImageEditorPoint {
    const axis = (value: number, size: number, containerSize: number) => {
      if (this.mode < 2) return clamp(value, 0, size)

      const half = containerSize / (2 * scale)

      return clamp(value, Math.min(half, size - half), Math.max(half, size - half))
    }

    return {
      x: axis(center.x, state.width, state.container.width),
      y: axis(center.y, state.height, state.container.height),
    }
  }

  /**
   * Size `rect` to at least the minimum and at most `limits` (keeping `ratio`), then move
   * it inside `limits`, from its centre or keeping its top-left corner.
   */
  private fitCrop(
    rect: CropRect,
    limits: CropRect,
    ratio: number | null,
    anchor: 'center' | 'start',
  ): CropRect {
    const min = Math.max(8, Math.min(this.options.width, this.options.height) * 0.05)
    let width = Math.max(rect.width, 1)
    let height = Math.max(rect.height, 1)

    if (ratio) {
      const grow = Math.max(1, min / width, min / height)
      width *= grow
      height *= grow
      const shrink = Math.min(1, limits.width / width, limits.height / height)
      width *= shrink
      height *= shrink
    } else {
      width = clamp(width, Math.min(min, limits.width), limits.width)
      height = clamp(height, Math.min(min, limits.height), limits.height)
    }

    const x = anchor === 'center' ? rect.x + rect.width / 2 - width / 2 : rect.x
    const y = anchor === 'center' ? rect.y + rect.height / 2 - height / 2 : rect.y

    return {
      x: clamp(x, limits.x, limits.x + limits.width - width),
      y: clamp(y, limits.y, limits.y + limits.height - height),
      width,
      height,
    }
  }

  /** The crop box in container pixels. */
  private toScreen(crop: CropRect, state: ImageEditorState = this.state): CropRect {
    const scale = this.scaleOf(state)

    return {
      x: (crop.x - state.center.x) * scale + state.container.width / 2,
      y: (crop.y - state.center.y) * scale + state.container.height / 2,
      width: crop.width * scale,
      height: crop.height * scale,
    }
  }

  /**
   * Tell the editor the container's size in CSS pixels (measure it on mount and resize).
   * Until then the container is assumed to be the editing area at its natural size.
   */
  setContainer(width: number, height: number): void {
    if (!(width > 0) || !(height > 0)) return

    const state = this.state

    if (this.measured && state.container.width === width && state.container.height === height) {
      return
    }

    this.measured = true

    const container = { width, height }
    const range = this.zoomRange(state.width, state.height, container)
    const zoom = clamp(state.zoom, range.min, range.max)
    const next = { ...state, container, zoom }
    const center = this.clampCenter(state.center, next, this.scaleOf(next))
    const placed = { ...next, center }

    this.store.update({
      container,
      zoom,
      center,
      crop: this.fitCrop(state.crop, this.limitsOf(placed), this.ratio, 'center'),
    })
  }

  /**
   * Zoom to `zoom` (relative to fitting the container), around `pivot` in container
   * pixels (the crop box's centre by default). The crop box stays where it is on screen,
   * so the part of the image it frames grows or shrinks.
   */
  zoomTo(zoom: number, pivot?: ImageEditorPoint): void {
    if (!Number.isFinite(zoom)) return

    const state = this.state
    const range = this.zoomLimits
    const next = clamp(zoom, range.min, range.max)

    if (next === state.zoom) return

    const before = this.scaleOf(state)
    const after = this.scaleOf({ ...state, zoom: next })
    const screen = this.toScreen(state.crop, state)
    const origin = pivot ?? { x: screen.x + screen.width / 2, y: screen.y + screen.height / 2 }
    const half = { x: state.container.width / 2, y: state.container.height / 2 }
    // The editing-area point under the pivot stays under it.
    const point = {
      x: state.center.x + (origin.x - half.x) / before,
      y: state.center.y + (origin.y - half.y) / before,
    }
    const center = this.clampCenter(
      { x: point.x - (origin.x - half.x) / after, y: point.y - (origin.y - half.y) / after },
      state,
      after,
    )
    const crop = {
      x: center.x + (screen.x - half.x) / after,
      y: center.y + (screen.y - half.y) / after,
      width: screen.width / after,
      height: screen.height / after,
    }
    const placed = { ...state, zoom: next, center }

    this.store.update({
      zoom: next,
      center,
      crop: this.fitCrop(crop, this.limitsOf(placed), this.ratio, 'center'),
    })
  }

  /** Multiply the zoom by `factor` (`> 1` zooms in). */
  zoomBy(factor: number, pivot?: ImageEditorPoint): void {
    if (factor > 0) this.zoomTo(this.state.zoom * factor, pivot)
  }

  zoomIn(): void {
    this.zoomBy(IMAGE_EDITOR_ZOOM_STEP)
  }

  zoomOut(): void {
    this.zoomBy(1 / IMAGE_EDITOR_ZOOM_STEP)
  }

  /**
   * A wheel event over the container: scroll zooms, and so does a trackpad pinch (which
   * browsers report as a wheel with `ctrlKey`, in finer steps). `pivot` is the pointer in
   * container pixels. Always handled (call `preventDefault()`).
   */
  wheel(
    event: Pick<WheelEvent, 'deltaY' | 'ctrlKey'> & { deltaMode?: number },
    pivot?: ImageEditorPoint,
  ): boolean {
    const lines = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1
    const delta = clamp(event.deltaY * lines, -200, 200)

    this.zoomBy(Math.exp(-delta * (event.ctrlKey ? 0.01 : 0.002)), pivot)

    return true
  }

  /**
   * Move the image by container pixels (the crop box stays put on screen, so it frames
   * another part). Stops where the crop box would leave its bounds.
   */
  panBy(dx: number, dy: number, from?: { center: ImageEditorPoint; crop: CropRect }): void {
    const state = this.state
    const start = from ?? { center: state.center, crop: state.crop }
    const scale = this.scaleOf(state)
    const bounds = this.boundsOf(state)
    const target = this.clampCenter(
      { x: start.center.x - dx / scale, y: start.center.y - dy / scale },
      state,
      scale,
    )
    const shiftX = clamp(
      target.x - start.center.x,
      bounds.x - start.crop.x,
      bounds.x + bounds.width - start.crop.x - start.crop.width,
    )
    const shiftY = clamp(
      target.y - start.center.y,
      bounds.y - start.crop.y,
      bounds.y + bounds.height - start.crop.y - start.crop.height,
    )

    this.store.update({
      center: { x: start.center.x + shiftX, y: start.center.y + shiftY },
      crop: { ...start.crop, x: start.crop.x + shiftX, y: start.crop.y + shiftY },
    })
  }

  /** Bring the crop box on screen (zooming out and centring on it when it isn't). */
  private reveal(): void {
    const state = this.state
    const visible = this.visibleOf(state)
    const { crop } = state
    const inside =
      crop.x >= visible.x - 0.5 &&
      crop.y >= visible.y - 0.5 &&
      crop.x + crop.width <= visible.x + visible.width + 0.5 &&
      crop.y + crop.height <= visible.y + visible.height + 0.5

    if (inside) return

    const fit = this.fitScale(state.width, state.height, state.container)
    const needed =
      Math.min(state.container.width / crop.width, state.container.height / crop.height) / fit
    const range = this.zoomLimits
    const zoom = clamp(Math.min(state.zoom, needed), range.min, range.max)
    const next = { ...state, zoom }
    const center = this.clampCenter(
      { x: crop.x + crop.width / 2, y: crop.y + crop.height / 2 },
      next,
      this.scaleOf(next),
    )
    const placed = { ...next, center }

    this.store.update({
      zoom,
      center,
      crop: this.fitCrop(crop, this.limitsOf(placed), this.ratio, 'center'),
    })
  }

  // ---------------------------------------------------------------------------------------
  // Crop box
  // ---------------------------------------------------------------------------------------

  setAspectRatio(aspectRatio: string | null): void {
    const state = this.state

    this.store.update({
      aspectRatio,
      ...this.layout(state.rotation, parseAspectRatio(aspectRatio), this.measuredContainer()),
    })
  }

  private measuredContainer(): { width: number; height: number } | null {
    return this.measured ? this.state.container : null
  }

  /**
   * Turn a quarter clockwise (`1`) or counter-clockwise (`-1`); a tilted image snaps to
   * the next quarter turn that way. The crop is reset.
   */
  rotate(direction: 1 | -1): void {
    const quarters = this.state.rotation / 90

    this.setRotation(
      direction > 0 ? (Math.floor(quarters) + 1) * 90 : (Math.ceil(quarters) - 1) * 90,
    )
  }

  /** Turn the image to `degrees` clockwise (any angle). The crop and zoom are reset. */
  setRotation(degrees: number): void {
    if (!Number.isFinite(degrees)) return

    this.store.update(this.layout(normalizeAngle(degrees), this.ratio, this.measuredContainer()))
  }

  flip(axis: 'x' | 'y'): void {
    const { crop, width, height, center } = this.state

    // Mirror the crop box and the camera with the image so it keeps framing the same part.
    this.store.update(
      axis === 'x'
        ? {
            flipX: !this.state.flipX,
            crop: { ...crop, x: width - crop.x - crop.width },
            center: { ...center, x: width - center.x },
          }
        : {
            flipY: !this.state.flipY,
            crop: { ...crop, y: height - crop.y - crop.height },
            center: { ...center, y: height - center.y },
          },
    )
  }

  reset(): void {
    this.store.update({
      flipX: false,
      flipY: false,
      ...this.layout(0, this.ratio, this.measuredContainer()),
    })
  }

  /** Move the crop box by image pixels, inside its bounds and on screen. */
  moveBy(dx: number, dy: number, from: CropRect = this.state.crop): void {
    const limits = this.limitsOf(this.state)

    this.store.update({
      crop: {
        ...from,
        x: clamp(from.x + dx, limits.x, limits.x + limits.width - from.width),
        y: clamp(from.y + dy, limits.y, limits.y + limits.height - from.height),
      },
    })
  }

  /** Drag a corner by image pixels; the opposite corner stays put and the ratio is kept. */
  resizeBy(handle: CropHandle, dx: number, dy: number, from: CropRect = this.state.crop): void {
    const limits = this.limitsOf(this.state)
    const ratio = this.ratio
    const min = this.minSize
    const west = handle === 'nw' || handle === 'sw'
    const north = handle === 'nw' || handle === 'ne'

    // The fixed corner and the room available towards the dragged one.
    const anchorX = west ? from.x + from.width : from.x
    const anchorY = north ? from.y + from.height : from.y
    const roomX = west ? anchorX - limits.x : limits.x + limits.width - anchorX
    const roomY = north ? anchorY - limits.y : limits.y + limits.height - anchorY

    let cropWidth = clamp(from.width + (west ? -dx : dx), Math.min(min, roomX), roomX)
    let cropHeight = clamp(from.height + (north ? -dy : dy), Math.min(min, roomY), roomY)

    if (ratio) {
      // Follow the axis that moved most, then shrink to fit the room.
      if (Math.abs(dx) >= Math.abs(dy)) cropHeight = cropWidth / ratio
      else cropWidth = cropHeight * ratio

      if (cropWidth > roomX) {
        cropWidth = roomX
        cropHeight = cropWidth / ratio
      }

      if (cropHeight > roomY) {
        cropHeight = roomY
        cropWidth = cropHeight * ratio
      }
    }

    this.store.update({
      crop: {
        x: west ? anchorX - cropWidth : anchorX,
        y: north ? anchorY - cropHeight : anchorY,
        width: cropWidth,
        height: cropHeight,
      },
    })
  }

  // ---------------------------------------------------------------------------------------
  // Numeric inputs
  // ---------------------------------------------------------------------------------------

  /** The values for the numeric inputs, rounded to whole pixels (Cropper.js `getData(true)`). */
  getData(): ImageEditorData {
    const { crop, image, rotation, flipX, flipY } = this.state

    return {
      x: Math.round(crop.x - image.x),
      y: Math.round(crop.y - image.y),
      width: Math.round(crop.width),
      height: Math.round(crop.height),
      rotate: Math.round(rotation * 100) / 100,
      scaleX: flipX ? -1 : 1,
      scaleY: flipY ? -1 : 1,
    }
  }

  /**
   * Apply numeric input values. Non-numbers are ignored; the crop is clamped to its
   * bounds (keeping the aspect ratio: a new width sets the height and vice versa) and
   * brought on screen. A rotation resets the crop, like the rotate buttons.
   */
  setData(data: Partial<ImageEditorData>): void {
    const finite = (value: number | undefined): value is number =>
      typeof value === 'number' && Number.isFinite(value)

    if (finite(data.rotate) && normalizeAngle(data.rotate) !== this.state.rotation) {
      this.setRotation(data.rotate)
    }

    if (finite(data.scaleX) && data.scaleX < 0 !== this.state.flipX) this.flip('x')
    if (finite(data.scaleY) && data.scaleY < 0 !== this.state.flipY) this.flip('y')

    if (![data.x, data.y, data.width, data.height].some(finite)) return

    const { crop, image } = this.state
    const ratio = this.ratio
    let width = finite(data.width) ? data.width : crop.width
    let height = finite(data.height) ? data.height : crop.height

    if (ratio) {
      if (finite(data.width)) height = width / ratio
      else if (finite(data.height)) width = height * ratio
    }

    const rect = {
      x: finite(data.x) ? data.x + image.x : crop.x,
      y: finite(data.y) ? data.y + image.y : crop.y,
      width,
      height,
    }

    this.store.update({ crop: this.fitCrop(rect, this.boundsOf(this.state), ratio, 'start') })
    this.reveal()
  }

  // ---------------------------------------------------------------------------------------
  // Pointer and keyboard
  // ---------------------------------------------------------------------------------------

  /**
   * Start dragging the crop box (`move`), a corner, or the image (`pan`). `scale` is
   * displayed px per image px (the camera's by default). A second pointer turns the
   * gesture into a pinch zoom.
   */
  startDrag(
    mode: ImageEditorDragMode,
    clientX: number,
    clientY: number,
    scale?: number,
    pointerId = 0,
  ): void {
    this.pointers.set(pointerId, { x: clientX, y: clientY })

    if (this.pointers.size === 2) {
      this.drag = null
      this.pinch = { distance: this.pointerDistance(), zoom: this.state.zoom }

      return
    }

    if (this.pointers.size > 2) return

    const factor = scale ?? this.displayScale

    this.drag = {
      mode,
      startX: clientX,
      startY: clientY,
      scale: factor > 0 ? factor : 1,
      crop: { ...this.state.crop },
      center: { ...this.state.center },
    }
  }

  private pointerDistance(): number {
    const [a, b] = [...this.pointers.values()]

    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0
  }

  dragTo(clientX: number, clientY: number, pointerId = 0): void {
    if (!this.pointers.has(pointerId)) return

    this.pointers.set(pointerId, { x: clientX, y: clientY })

    if (this.pinch) {
      const distance = this.pointerDistance()

      if (this.pinch.distance > 0 && distance > 0) {
        this.zoomTo((this.pinch.zoom * distance) / this.pinch.distance)
      }

      return
    }

    const drag = this.drag

    if (!drag) return

    if (drag.mode === 'pan') {
      this.panBy(clientX - drag.startX, clientY - drag.startY, drag)

      return
    }

    const dx = (clientX - drag.startX) / drag.scale
    const dy = (clientY - drag.startY) / drag.scale

    if (drag.mode === 'move') this.moveBy(dx, dy, drag.crop)
    else this.resizeBy(drag.mode, dx, dy, drag.crop)
  }

  /** End the gesture of `pointerId` (every gesture without one). */
  endDrag(pointerId?: number): void {
    if (pointerId === undefined) this.pointers.clear()
    else this.pointers.delete(pointerId)

    this.drag = null
    this.pinch = null
  }

  get dragging(): boolean {
    return this.drag !== null || this.pinch !== null
  }

  /**
   * Arrow keys move the crop box (with Shift they resize it from the bottom-right
   * corner); `+` and `-` zoom. True when the key was handled.
   */
  handleKey(event: Pick<KeyboardEvent, 'key' | 'shiftKey'>): boolean {
    if (event.key === '+' || event.key === '=') {
      this.zoomIn()

      return true
    }

    if (event.key === '-' || event.key === '_') {
      this.zoomOut()

      return true
    }

    const step = Math.max(1, Math.round(Math.min(this.state.width, this.state.height) / 50))
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }
    const move = moves[event.key]

    if (!move) return false

    if (event.shiftKey) this.resizeBy('se', move[0], move[1])
    else this.moveBy(move[0], move[1])

    return true
  }

  // ---------------------------------------------------------------------------------------
  // Drawing
  // ---------------------------------------------------------------------------------------

  /** The crop box as percentages of the container, for `left/top/width/height` styles. */
  cropBox(): { left: number; top: number; width: number; height: number } {
    const { container } = this.state
    const screen = this.toScreen(this.state.crop)

    return {
      left: (screen.x / container.width) * 100,
      top: (screen.y / container.height) * 100,
      width: (screen.width / container.width) * 100,
      height: (screen.height / container.height) * 100,
    }
  }

  /** The rotated image's corners in editing-area pixels. */
  private imageCorners(): ImageEditorPoint[] {
    const { rotation, flipX, flipY, width, height } = this.state
    const radians = (rotation * Math.PI) / 180
    const cos = Math.cos(radians)
    const sin = Math.sin(radians)
    const halfWidth = this.options.width / 2
    const halfHeight = this.options.height / 2

    return [
      [-halfWidth, -halfHeight],
      [halfWidth, -halfHeight],
      [halfWidth, halfHeight],
      [-halfWidth, halfHeight],
    ].map(([x = 0, y = 0]) => ({
      x: width / 2 + (flipX ? -1 : 1) * (x * cos - y * sin),
      y: height / 2 + (flipY ? -1 : 1) * (x * sin + y * cos),
    }))
  }

  /** Draw the rotated and flipped image in editing-area pixels (crop ignored). */
  private paint(context: CanvasRenderingContext2D, source: CanvasImageSource): void {
    const { rotation, flipX, flipY, width, height, image } = this.state

    // `emptyFillColor`: paint the space around the image only (its own transparency stays).
    if (this.emptyFillColor) {
      if (rotation % 90 === 0) {
        if (image.width < width || image.height < height) {
          context.save()
          context.fillStyle = this.emptyFillColor
          context.fillRect(0, 0, width, height)
          context.clearRect(image.x, image.y, image.width, image.height)
          context.restore()
        }
      } else {
        // A tilted image: fill the area minus the image's outline.
        context.save()
        context.fillStyle = this.emptyFillColor
        context.beginPath()
        context.rect(0, 0, width, height)
        this.imageCorners().forEach((corner, index) =>
          index === 0 ? context.moveTo(corner.x, corner.y) : context.lineTo(corner.x, corner.y),
        )
        context.closePath()
        context.fill('evenodd')
        context.restore()
      }
    }

    context.save()
    context.translate(width / 2, height / 2)
    context.scale(flipX ? -1 : 1, flipY ? -1 : 1)
    context.rotate((rotation * Math.PI) / 180)
    context.drawImage(source, -this.options.width / 2, -this.options.height / 2)
    context.restore()
  }

  /**
   * Draw what the container shows (the image through the camera) into a canvas that
   * covers the container, at `pixelRatio` device pixels per CSS pixel.
   */
  drawPreview(canvas: HTMLCanvasElement, source: CanvasImageSource, pixelRatio = 1): void {
    const { container, center } = this.state
    const ratio = clamp(
      pixelRatio > 0 ? pixelRatio : 1,
      0.1,
      4096 / Math.max(container.width, container.height, 1),
    )
    const scale = this.displayScale

    canvas.width = Math.max(1, Math.round(container.width * ratio))
    canvas.height = Math.max(1, Math.round(container.height * ratio))

    const context = canvas.getContext('2d')

    if (!context) return

    context.clearRect(0, 0, canvas.width, canvas.height)
    context.save()
    context.scale(ratio, ratio)
    context.translate(container.width / 2, container.height / 2)
    context.scale(scale, scale)
    context.translate(-center.x, -center.y)
    this.paint(context, source)
    context.restore()
  }

  /** The cropped result as a file of the same type (PNG for types the browser can't write). */
  async export(source: CanvasImageSource, file: Pick<File, 'name' | 'type'>): Promise<File> {
    const { crop } = this.state
    const full = document.createElement('canvas')
    full.width = Math.max(1, Math.round(this.state.width))
    full.height = Math.max(1, Math.round(this.state.height))
    const fullContext = full.getContext('2d')

    if (!fullContext) throw new Error('Canvas is not available.')

    this.paint(fullContext, source)

    const output = document.createElement('canvas')
    output.width = Math.max(1, Math.round(crop.width))
    output.height = Math.max(1, Math.round(crop.height))
    output
      .getContext('2d')
      ?.drawImage(full, crop.x, crop.y, crop.width, crop.height, 0, 0, output.width, output.height)

    const type = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
      ? file.type
      : 'image/png'
    const blob = await new Promise<Blob | null>((resolve) => output.toBlob(resolve, type, 0.92))

    if (!blob) throw new Error('The image could not be encoded.')

    const name =
      type === file.type ? file.name : `${file.name.replace(/\.[^.]+$/, '') || 'image'}.png`

    return new File([blob], name, { type, lastModified: Date.now() })
  }
}
