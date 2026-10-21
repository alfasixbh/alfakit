import { afterEach, describe, expect, it } from 'vitest'
import { documentNonce } from '../src/csp'

describe('documentNonce', () => {
  afterEach(() => {
    document.head.innerHTML = ''
  })

  it('is undefined without a nonce on the page', () => {
    document.head.innerHTML = '<script></script><style></style>'

    expect(documentNonce()).toBeUndefined()
  })

  it('reads the nonce of the server-rendered script or style tags', () => {
    const style = document.createElement('style')
    style.nonce = 'abc123'
    document.head.append(document.createElement('script'), style)

    expect(documentNonce()).toBe('abc123')
  })
})
