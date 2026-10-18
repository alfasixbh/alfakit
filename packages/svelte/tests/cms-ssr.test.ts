// @vitest-environment node
import { render } from 'svelte/server'
import { cmsPayloadFixture } from '../../core/tests/fixtures/cms-payload'
import CmsBlocks from '../src/components/cms/CmsBlocks.svelte'
import CmsPage from '../src/components/cms/CmsPage.svelte'

describe('CMS server rendering', () => {
  it('server-renders blocks without a registry', () => {
    const { body } = render(CmsBlocks, { props: { blocks: cmsPayloadFixture().page.blocks } })

    expect(typeof window).toBe('undefined')
    expect(body).toContain('We build things')
    expect(body).toContain('<details')
    expect(body).not.toContain('unknown')
  })

  it('server-renders the page with its head tags', () => {
    const { head, body } = render(CmsPage, { props: { cms: cmsPayloadFixture() } })

    expect(head).toContain('<title>About us | Acme</title>')
    expect(head).toContain('rel="canonical"')
    expect(head).toContain('<script type="application/ld+json">')
    expect(body).toContain('data-slot="cms-page"')
  })
})
