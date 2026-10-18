import type { CmsPayload } from '../../src/schema/cms'

/** A rendered CMS page as `CmsPageResponse` sends it, shared by the renderer tests. */
export function cmsPayloadFixture(overrides: Partial<CmsPayload> = {}): CmsPayload {
  return {
    page: {
      id: 1,
      title: 'About us',
      path: 'company/about',
      url: 'https://example.com/company/about',
      locale: null,
      isHome: false,
      layout: null,
      publishedAt: '2026-10-01T09:00:00+00:00',
      updatedAt: '2026-10-02T09:00:00+00:00',
      breadcrumbs: [
        { label: 'Company', url: 'https://example.com/company' },
        { label: 'About us', url: 'https://example.com/company/about' },
      ],
      alternates: [],
      seo: {
        title: 'About us | Acme',
        description: 'Who we are',
        canonical: 'https://example.com/company/about',
        robots: 'index, follow',
        openGraph: { title: 'About us | Acme', siteName: 'Acme' },
        twitter: { card: 'summary' },
        alternates: [],
        jsonLd:
          '{"@context":"https://schema.org","@graph":[{"@type":"WebPage","name":"About \\u003Cus\\u003E"}]}',
      },
      blocks: [
        {
          type: 'hero',
          id: 'block-1',
          data: {
            eyebrow: 'Since 2010',
            heading: 'We build things',
            subheading: 'Small team, big ideas.',
            primaryAction: { label: 'Contact', url: '/contact', newTab: false },
            secondaryAction: { label: 'Docs', url: 'https://docs.example.com', newTab: true },
            image: null,
            alignment: 'center',
          },
        },
        {
          type: 'rich-text',
          id: 'block-2',
          data: { html: '<p>Hello <strong>world</strong></p>', width: 'prose' },
        },
        {
          type: 'faq',
          id: 'block-3',
          data: { heading: 'Questions', items: [{ question: 'Why?', answer: 'Because.' }] },
        },
        {
          type: 'embed',
          id: 'block-4',
          data: {
            embed: {
              provider: 'youtube',
              src: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
              title: 'Intro video',
            },
            caption: null,
            aspectRatio: '16/9',
          },
        },
        {
          type: 'columns',
          id: 'block-5',
          data: {
            align: 'start',
            columns: [
              { blocks: [{ type: 'pricing', id: 'd1-block-1', data: { plan: 'Pro' } }] },
              {
                blocks: [
                  {
                    type: 'rich-text',
                    id: 'd1-block-2',
                    data: { html: '<p>Right column</p>', width: 'prose' },
                  },
                ],
              },
            ],
          },
        },
        {
          type: 'form',
          id: 'block-6',
          data: {
            heading: 'Write to us',
            description: null,
            form: 'contact',
            payload: { action: '/forms/contact' },
          },
        },
        { type: 'unknown', id: 'block-7', data: {} },
      ],
    },
    menus: {
      main: {
        handle: 'main',
        name: 'Main',
        items: [
          {
            id: 'm1-1',
            label: 'Company',
            url: 'https://example.com/company',
            newTab: false,
            current: false,
            active: true,
            children: [
              {
                id: 'm1-1-1',
                label: 'About us',
                url: 'https://example.com/company/about',
                newTab: false,
                current: true,
                active: true,
                children: [],
              },
            ],
          },
          {
            id: 'm1-2',
            label: 'Docs',
            url: 'https://docs.example.com',
            newTab: true,
            current: false,
            active: false,
            children: [],
          },
        ],
      },
      footer: {
        handle: 'footer',
        name: 'Footer',
        items: [
          {
            id: 'm2-1',
            label: 'Privacy',
            url: '/privacy',
            newTab: false,
            current: false,
            active: false,
            children: [],
          },
        ],
      },
    },
    site: {
      name: 'Acme',
      url: 'https://example.com',
      locale: 'en',
      tag: 'en',
      direction: 'ltr',
      locales: [],
    },
    preview: false,
    translations: { cms: { skip_to_content: 'Skip to content', preview: 'Preview' } },
    ...overrides,
  }
}
