import {
  cmsAspectClass,
  cmsBlockKey,
  cmsBlocks,
  cmsColumnsClass,
  cmsGridClass,
  cmsHeadTags,
  cmsLinkRel,
  cmsPayload,
  createCmsTranslator,
} from '../src/cms'
import { cmsPayloadFixture } from './fixtures/cms-payload'

describe('cms helpers', () => {
  it('keys block renderers and keeps only well-formed blocks', () => {
    expect(cmsBlockKey('pricing')).toBe('cms:block:pricing')
    expect(
      cmsBlocks([{ type: 'hero', id: 'b1', data: {} }, { type: 'x' }, null, 'nope']),
    ).toHaveLength(1)
    expect(cmsBlocks(undefined)).toEqual([])
  })

  it('spells out layout classes for every allowed value', () => {
    expect(cmsGridClass(3)).toBe('grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3')
    expect(cmsGridClass(9)).toContain('lg:grid-cols-4')
    expect(cmsColumnsClass(2)).toBe('grid grid-cols-1 gap-8 md:grid-cols-2')
    expect(cmsAspectClass('4/3')).toBe('aspect-[4/3]')
    expect(cmsAspectClass('bogus')).toBe('aspect-video')
    expect(cmsLinkRel(true)).toBe('noopener noreferrer')
    expect(cmsLinkRel(false)).toBeUndefined()
  })

  it('maps the SEO payload to head tags and drops unsafe JSON-LD', () => {
    const seo = cmsPayloadFixture().page.seo
    const tags = cmsHeadTags({
      ...seo,
      alternates: [{ hreflang: 'ar', href: 'https://example.com/ar/about' }],
    })

    expect(tags.title).toBe('About us | Acme')
    expect(tags.meta).toContainEqual({ name: 'description', content: 'Who we are' })
    expect(tags.meta).toContainEqual({ property: 'og:site_name', content: 'Acme' })
    expect(tags.meta).toContainEqual({ name: 'twitter:card', content: 'summary' })
    expect(tags.links).toContainEqual({
      rel: 'alternate',
      hreflang: 'ar',
      href: 'https://example.com/ar/about',
    })
    expect(cmsHeadTags({ ...seo, jsonLd: '</script>' }).jsonLd).toBeNull()
    expect(cmsHeadTags(null)).toEqual({ title: '', meta: [], links: [], jsonLd: null })
  })

  it('translates the page strings and reads the cms prop', () => {
    const payload = cmsPayloadFixture()
    const translator = createCmsTranslator(payload)

    expect(translator.t('cms.skip_to_content', {}, 'x')).toBe('Skip to content')
    expect(translator.t('cms.missing', {}, 'Fallback')).toBe('Fallback')
    expect(cmsPayload({ cms: payload })).toBe(payload)
    expect(cmsPayload({ page: {} })).toBeNull()
  })
})
