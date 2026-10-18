import { HttpError, PAGE_EXPIRED_STATUS, reloadExpiredPage, requestJson } from './http'

/**
 * Temporary uploads: one request for small files, resumable chunks for files larger than
 * the panel's `uploadChunkSize` (`alfakit.uploads.chunk_size`). Every check (size, type,
 * owner) runs on the server; this only moves bytes and reports progress.
 */

export interface TemporaryUploadResult {
  key: string
  name: string
  size: number
  mime?: string
}

export interface TemporaryUploadOptions {
  /** `panel.endpoints.uploadChunks`: without it every file is sent in one request. */
  chunkEndpoint?: string
  /** `panel.uploadChunkSize` in bytes: larger files are chunked. */
  chunkSize?: number
  /** The component's encrypted upload policy (its size limit and accepted types). */
  policy?: string | null
  /** Overall progress, 0–1, across all chunks. */
  onProgress?: (progress: number) => void
  /**
   * Report progress within a file sent in one request too (an `XMLHttpRequest`, since
   * `fetch` has no upload progress). Off, small files report 1 once uploaded.
   */
  singleRequestProgress?: boolean
  signal?: AbortSignal
  /** Attempts per chunk after the first (default 3). */
  retries?: number
  /** Delay before the first retry in milliseconds, doubled on each attempt (default 500). */
  retryDelay?: number
}

interface ChunkedUploadState {
  upload: string
  chunkSize: number
  chunks: number
  received: number[]
}

function csrfHeaders(): Record<string, string> {
  if (typeof document === 'undefined') return {}

  const cookie = document.cookie.split('; ').find((part) => part.startsWith('XSRF-TOKEN='))

  if (cookie) return { 'X-XSRF-TOKEN': decodeURIComponent(cookie.slice('XSRF-TOKEN='.length)) }

  const meta = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')

  return meta?.content ? { 'X-CSRF-TOKEN': meta.content } : {}
}

/**
 * POST a form with upload progress events (`fetch` has none). Rejects with an `HttpError`
 * carrying Laravel's validation errors.
 */
export function postFormWithProgress<T>(
  endpoint: string,
  body: FormData,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal,
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))

      return
    }

    const request = new XMLHttpRequest()

    request.open('POST', endpoint)
    request.withCredentials = true
    request.setRequestHeader('Accept', 'application/json')
    request.setRequestHeader('X-Requested-With', 'XMLHttpRequest')

    for (const [name, value] of Object.entries(csrfHeaders())) request.setRequestHeader(name, value)

    const abort = () => request.abort()
    signal?.addEventListener('abort', abort, { once: true })

    request.upload.onprogress = (event) => {
      if (onProgress && event.lengthComputable && event.total > 0) {
        onProgress(event.loaded / event.total)
      }
    }
    request.onabort = () => reject(new DOMException('Aborted', 'AbortError'))
    request.onerror = () => reject(new Error('Network error'))
    request.onload = () => {
      signal?.removeEventListener('abort', abort)
      let data: unknown

      try {
        data = request.responseText ? JSON.parse(request.responseText) : null
      } catch {
        data = request.responseText
      }

      if (request.status === PAGE_EXPIRED_STATUS) reloadExpiredPage()

      if (request.status >= 200 && request.status < 300) {
        resolve(data as T)
      } else {
        reject(new HttpError(request.status, data, (data as { message?: string } | null)?.message))
      }
    }
    request.send(body)
  })
}

/** Ids of unfinished chunked uploads by file, so picking the same file again resumes it. */
const resumable = new Map<string, string>()

function fileIdentity(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`
}

/** Whether a file is sent in chunks with these options. */
export function shouldChunkUpload(file: Blob, options: TemporaryUploadOptions): boolean {
  return Boolean(options.chunkEndpoint && options.chunkSize && file.size > options.chunkSize)
}

/** Client errors are final; network failures, timeouts, throttling and 5xx are retried. */
function isRetryable(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return false
  if (error instanceof HttpError) {
    return error.status === 408 || error.status === 429 || error.status >= 500
  }

  return true
}

function wait(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, milliseconds)

    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(new DOMException('Aborted', 'AbortError'))
      },
      { once: true },
    )
  })
}

/**
 * Upload a file to the temporary upload endpoint and resolve with its `tmp:` key. Files
 * larger than `chunkSize` go in chunks: started (or resumed), sent one by one with each
 * failed chunk retried, then completed, when the server assembles and validates the file.
 */
export async function uploadTemporaryFile(
  endpoint: string,
  file: File,
  options: TemporaryUploadOptions = {},
): Promise<TemporaryUploadResult> {
  if (!shouldChunkUpload(file, options)) {
    const body = new FormData()
    body.append('file', file, file.name)
    if (options.policy) body.append('policy', options.policy)

    if (options.singleRequestProgress) {
      return postFormWithProgress<TemporaryUploadResult>(
        endpoint,
        body,
        options.onProgress,
        options.signal,
      )
    }

    const result = await requestJson<TemporaryUploadResult>(endpoint, {
      method: 'POST',
      body,
      signal: options.signal,
    })
    options.onProgress?.(1)

    return result
  }

  const base = options.chunkEndpoint!.replace(/\/$/, '')
  const identity = fileIdentity(file)
  const state = await requestJson<ChunkedUploadState>(base, {
    method: 'POST',
    body: {
      name: file.name,
      size: file.size,
      type: file.type,
      policy: options.policy ?? undefined,
      upload: resumable.get(identity),
    },
    signal: options.signal,
  })

  resumable.set(identity, state.upload)

  const url = `${base}/${encodeURIComponent(state.upload)}`
  const received = new Set(state.received)
  const retries = options.retries ?? 3
  const delay = options.retryDelay ?? 500
  let done = received.size * state.chunkSize
  const report = (extra: number) => options.onProgress?.(Math.min(1, (done + extra) / file.size))

  report(0)

  for (let index = 0; index < state.chunks; index++) {
    if (received.has(index)) continue

    const start = index * state.chunkSize
    const chunk = file.slice(start, Math.min(file.size, start + state.chunkSize))

    for (let attempt = 0; ; attempt++) {
      const body = new FormData()
      body.append('index', String(index))
      body.append('chunk', chunk, `${index}.part`)

      try {
        await postFormWithProgress(
          url,
          body,
          (progress) => report(progress * chunk.size),
          options.signal,
        )
        break
      } catch (error) {
        if (attempt >= retries || !isRetryable(error)) throw error

        await wait(delay * 2 ** attempt, options.signal)
      }
    }

    done += chunk.size
    report(0)
  }

  const result = await requestJson<TemporaryUploadResult>(`${url}/complete`, {
    method: 'POST',
    signal: options.signal,
  })

  resumable.delete(identity)

  return result
}

/** Cancel an unfinished chunked upload of this file and delete its chunks on the server. */
export async function cancelChunkedUpload(chunkEndpoint: string, file: File): Promise<void> {
  const identity = fileIdentity(file)
  const id = resumable.get(identity)

  if (!id) return

  resumable.delete(identity)
  await requestJson(`${chunkEndpoint.replace(/\/$/, '')}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }).catch(() => undefined)
}

/** The upload options a renderer derives from the panel schema. */
export function panelUploadOptions(
  panel: { endpoints: { uploadChunks?: string }; uploadChunkSize?: number },
  policy?: string | null,
): Pick<TemporaryUploadOptions, 'chunkEndpoint' | 'chunkSize' | 'policy'> {
  return {
    chunkEndpoint: panel.endpoints.uploadChunks,
    chunkSize: panel.uploadChunkSize,
    policy,
  }
}
