import { EditorAttachments } from '../src/utils/attachments'

describe('rich editor attachments', () => {
  it('stores uploaded images by their temporary key and previews them locally', () => {
    let next = 0
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => `blob:http://app.test/${++next}`),
      revokeObjectURL: vi.fn(),
    })

    const attachments = new EditorAttachments()
    const url = attachments.add('tmp:01HZX0000000000000000000AA.png', new Blob(['x']))

    expect(url).toBe('blob:http://app.test/1')
    expect(attachments.add('tmp:01HZX0000000000000000000AA.png', new Blob(['x']))).toBe(url)

    const html = `<p>Hi</p><img src="${url}" alt="a.png">`
    const state = attachments.toState(html)

    expect(state).toBe('<p>Hi</p><img src="tmp:01HZX0000000000000000000AA.png" alt="a.png">')
    expect(attachments.toEditor(state)).toBe(html)
    expect(attachments.toState(`![a](${url})`)).toBe('![a](tmp:01HZX0000000000000000000AA.png)')

    attachments.destroy()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(url)

    vi.unstubAllGlobals()
  })
})
