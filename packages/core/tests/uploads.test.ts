import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError, shouldChunkUpload, uploadTemporaryFile } from '../src'

interface SentForm {
  url: string
  form: FormData
}

let sent: SentForm[] = []
/** Status for each XHR, in order; 200 when the list runs out. */
let statuses: number[] = []

class FakeXhr {
  status = 0
  responseText = ''
  upload: { onprogress: ((event: ProgressEvent) => void) | null } = { onprogress: null }
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  onabort: (() => void) | null = null
  private url = ''

  open(_method: string, url: string) {
    this.url = url
  }

  setRequestHeader() {}

  abort() {
    this.onabort?.()
  }

  send(form: FormData) {
    sent.push({ url: this.url, form })
    const status = statuses.shift() ?? 200
    const size = (form.get('chunk') as Blob | null)?.size ?? (form.get('file') as Blob).size

    queueMicrotask(() => {
      this.upload.onprogress?.({
        lengthComputable: true,
        loaded: size / 2,
        total: size,
      } as ProgressEvent)
      this.status = status
      this.responseText = JSON.stringify(
        status === 422
          ? { message: 'Invalid', errors: { chunk: ['Invalid'] } }
          : form.has('file')
            ? { key: 'tmp:single', name: 'a.bin', size }
            : { received: [] },
      )
      if (status === 0) this.onerror?.()
      else this.onload?.()
    })
  }
}

const fetchMock = vi.fn()

function json(data: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(data), { status }))
}

beforeEach(() => {
  sent = []
  statuses = []
  vi.stubGlobal('XMLHttpRequest', FakeXhr)
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function file(size: number, name = 'video.mp4'): File {
  return new File([new Uint8Array(size)], name, { type: 'video/mp4', lastModified: size })
}

const options = { chunkEndpoint: '/_alfakit/uploads/chunks', chunkSize: 10, retryDelay: 0 }

describe('uploadTemporaryFile', () => {
  it('sends small files in one request with the policy', async () => {
    const progress: number[] = []
    const result = await uploadTemporaryFile('/_alfakit/uploads', file(10), {
      ...options,
      policy: 'signed',
      singleRequestProgress: true,
      onProgress: (value) => progress.push(value),
    })

    expect(result.key).toBe('tmp:single')
    expect(sent).toHaveLength(1)
    expect(sent[0]!.form.get('policy')).toBe('signed')
    expect(progress).toEqual([0.5])
    expect(fetchMock).not.toHaveBeenCalled()
    expect(shouldChunkUpload(file(11), options)).toBe(true)
    expect(shouldChunkUpload(file(11), { chunkSize: 10 })).toBe(false)
  })

  it('sends small files with fetch unless progress within the request is asked for', async () => {
    fetchMock.mockReturnValueOnce(json({ key: 'tmp:fetched', name: 'a.bin', size: 10 }))
    const progress: number[] = []

    const result = await uploadTemporaryFile('/_alfakit/uploads', file(10), {
      ...options,
      onProgress: (value) => progress.push(value),
    })

    expect(result.key).toBe('tmp:fetched')
    expect(sent).toHaveLength(0)
    expect(progress).toEqual([1])
    expect(fetchMock.mock.calls[0]![1].body).toBeInstanceOf(FormData)
  })

  it('uploads large files in chunks, retrying a failed chunk, and completes them', async () => {
    fetchMock
      .mockReturnValueOnce(json({ upload: 'ID1', chunkSize: 10, chunks: 3, received: [] }))
      .mockReturnValueOnce(json({ key: 'tmp:big', name: 'video.mp4', size: 25 }))
    // Chunk 1 fails once with a server error, then succeeds.
    statuses = [200, 500, 200, 200]
    const progress: number[] = []

    const result = await uploadTemporaryFile('/_alfakit/uploads', file(25), {
      ...options,
      policy: 'signed',
      onProgress: (value) => progress.push(value),
    })

    expect(result.key).toBe('tmp:big')

    const [startUrl, start] = fetchMock.mock.calls[0]!
    expect(startUrl).toBe('/_alfakit/uploads/chunks')
    expect(JSON.parse(start.body as string)).toMatchObject({
      name: 'video.mp4',
      size: 25,
      policy: 'signed',
    })
    expect(fetchMock.mock.calls[1]![0]).toBe('/_alfakit/uploads/chunks/ID1/complete')

    expect(
      sent.map(({ url, form }) => [url, form.get('index'), (form.get('chunk') as Blob).size]),
    ).toEqual([
      ['/_alfakit/uploads/chunks/ID1', '0', 10],
      ['/_alfakit/uploads/chunks/ID1', '1', 10],
      ['/_alfakit/uploads/chunks/ID1', '1', 10],
      ['/_alfakit/uploads/chunks/ID1', '2', 5],
    ])

    // Progress covers the whole file and never goes backwards past a finished chunk.
    expect(progress.at(-1)).toBe(1)
    expect(progress).toContain(0.4)
  })

  it('resumes a failed upload of the same file, skipping chunks the server has', async () => {
    fetchMock.mockReturnValueOnce(json({ upload: 'ID2', chunkSize: 10, chunks: 2, received: [] }))
    // Validation errors are final.
    statuses = [200, 422]

    const big = file(20, 'resume.mp4')

    await expect(uploadTemporaryFile('/_alfakit/uploads', big, options)).rejects.toBeInstanceOf(
      HttpError,
    )
    expect(sent).toHaveLength(2)

    sent = []
    fetchMock
      .mockReturnValueOnce(json({ upload: 'ID2', chunkSize: 10, chunks: 2, received: [0] }))
      .mockReturnValueOnce(json({ key: 'tmp:resumed', name: 'resume.mp4', size: 20 }))

    const result = await uploadTemporaryFile('/_alfakit/uploads', big, options)

    expect(result.key).toBe('tmp:resumed')
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body as string).upload).toBe('ID2')
    expect(sent.map(({ form }) => form.get('index'))).toEqual(['1'])
  })

  it('gives up on a chunk after the retries', async () => {
    fetchMock.mockReturnValueOnce(json({ upload: 'ID3', chunkSize: 10, chunks: 2, received: [] }))
    statuses = [0, 0, 0]

    await expect(
      uploadTemporaryFile('/_alfakit/uploads', file(20, 'offline.mp4'), { ...options, retries: 2 }),
    ).rejects.toThrow('Network error')
    expect(sent).toHaveLength(3)
  })
})
