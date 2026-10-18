export interface ImageTransformOptions {
  /** `FileUpload::imageCropAspectRatio()`: `'16:9'`, `'1:1'`, `'4/3'`. */
  aspectRatio?: string | null
  /** `FileUpload::imageResizeMode()`: `cover` (default), `contain` or `force`. */
  mode?: string | null
  width?: number | null
  height?: number | null
  /**
   * `FileUpload::orientImagesFromExif()` when the server can't: re-encode JPEGs so the
   * browser's EXIF orientation is baked into the pixels.
   */
  orient?: boolean | null
}

export interface ImageGeometry {
  /** Source rectangle to draw from. */
  sx: number
  sy: number
  sw: number
  sh: number
  /** Output size. */
  width: number
  height: number
}

/** Parse `'16:9'` / `'16/9'` / `'1.5'` into width ÷ height. */
export function parseAspectRatio(ratio: string | null | undefined): number | null {
  if (!ratio) {
    return null
  }

  const [width, height = '1'] = ratio.split(/[:/]/)
  const value = Number(width) / Number(height)

  return Number.isFinite(value) && value > 0 ? value : null
}

/** Centre-crop a `width × height` rectangle to `ratio`. */
function cropTo(
  rect: Pick<ImageGeometry, 'sx' | 'sy' | 'sw' | 'sh'>,
  ratio: number,
): Pick<ImageGeometry, 'sx' | 'sy' | 'sw' | 'sh'> {
  if (rect.sw / rect.sh > ratio) {
    const sw = rect.sh * ratio

    return { ...rect, sx: rect.sx + (rect.sw - sw) / 2, sw }
  }

  const sh = rect.sw / ratio

  return { ...rect, sy: rect.sy + (rect.sh - sh) / 2, sh }
}

/**
 * Where to crop and how large to draw an image for the FileUpload crop/resize options,
 * or null when the image is used as is.
 */
export function imageGeometry(
  sourceWidth: number,
  sourceHeight: number,
  options: ImageTransformOptions,
): ImageGeometry | null {
  const ratio = parseAspectRatio(options.aspectRatio)
  const width = options.width && options.width > 0 ? options.width : null
  const height = options.height && options.height > 0 ? options.height : null

  if ((!ratio && !width && !height) || sourceWidth <= 0 || sourceHeight <= 0) {
    return null
  }

  let rect = { sx: 0, sy: 0, sw: sourceWidth, sh: sourceHeight }

  if (ratio) {
    rect = cropTo(rect, ratio)
  }

  let outWidth = rect.sw
  let outHeight = rect.sh
  const mode = options.mode ?? 'cover'

  if (width && height) {
    if (mode === 'force') {
      outWidth = width
      outHeight = height
    } else if (mode === 'contain') {
      const scale = Math.min(width / rect.sw, height / rect.sh)
      outWidth = rect.sw * scale
      outHeight = rect.sh * scale
    } else {
      rect = cropTo(rect, width / height)
      outWidth = width
      outHeight = height
    }
  } else if (width) {
    outWidth = width
    outHeight = mode === 'force' ? rect.sh : (rect.sh * width) / rect.sw
  } else if (height) {
    outHeight = height
    outWidth = mode === 'force' ? rect.sw : (rect.sw * height) / rect.sh
  }

  return {
    ...rect,
    width: Math.max(1, Math.round(outWidth)),
    height: Math.max(1, Math.round(outHeight)),
  }
}

/** Raster formats the browser can re-encode (SVG and GIF are left alone). */
const TRANSFORMABLE = new Set(['image/jpeg', 'image/png', 'image/webp'])

/**
 * Apply the FileUpload crop/resize options to an image before it is uploaded. Files the
 * browser can't decode or re-encode are returned unchanged.
 */
export async function transformImage(file: File, options: ImageTransformOptions): Promise<File> {
  if (
    !TRANSFORMABLE.has(file.type) ||
    typeof document === 'undefined' ||
    typeof createImageBitmap !== 'function'
  ) {
    return file
  }

  try {
    const bitmap = await createImageBitmap(file)
    const geometry =
      imageGeometry(bitmap.width, bitmap.height, options) ??
      (options.orient && file.type === 'image/jpeg'
        ? {
            sx: 0,
            sy: 0,
            sw: bitmap.width,
            sh: bitmap.height,
            width: bitmap.width,
            height: bitmap.height,
          }
        : null)

    if (!geometry) {
      bitmap.close()

      return file
    }

    const canvas = document.createElement('canvas')
    canvas.width = geometry.width
    canvas.height = geometry.height
    canvas
      .getContext('2d')
      ?.drawImage(
        bitmap,
        geometry.sx,
        geometry.sy,
        geometry.sw,
        geometry.sh,
        0,
        0,
        geometry.width,
        geometry.height,
      )
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, file.type, 0.92),
    )

    return blob ? new File([blob], file.name, { type: file.type, lastModified: Date.now() }) : file
  } catch {
    return file
  }
}
