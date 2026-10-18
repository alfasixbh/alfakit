import type { AiCopilotSchema } from '@alfakit/core'
import { Translator } from '@alfakit/core'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import RenderComponent from '../src/components/schema/RenderComponent.vue'
import { ALFAKIT_KEY } from '../src/context'
import { actions, flush, mountWithAlfakit, panel, registry } from './mocks'

const copilot: AiCopilotSchema = {
  type: 'ai:copilot',
  key: 'ai-copilot',
  endpoints: {
    conversations: '/ai/_ai/copilot/conversations',
    conversation: '/ai/_ai/copilot/conversations/__ID__',
    send: '/ai/_ai/copilot/messages',
    confirm: '/ai/_ai/copilot/actions/__ID__/confirm',
    reject: '/ai/_ai/copilot/actions/__ID__/reject',
    delete: '/ai/_ai/copilot/conversations/__ID__',
  },
  placeholder: '__ID__',
  keyBindings: ['mod+j'],
  currency: 'USD',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** Flush until `check` passes; fails loudly instead of silently spinning out. */
async function until(check: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (check()) return
    await flush()
  }

  if (!check()) throw new Error(`Timed out waiting for: ${check.toString()}`)
}

const text = () => document.body.textContent ?? ''

describe('AI copilot', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    sessionStorage.clear()
    document.body.innerHTML = ''
  })

  it('is registered as ai:copilot and renders its button on the server', async () => {
    expect(registry.has('ai:copilot')).toBe(true)

    const app = createSSRApp({ render: () => h(RenderComponent, { component: copilot }) })
    app.provide(ALFAKIT_KEY, {
      registry,
      pages: {},
      actions,
      translator: new Translator(panel.translations),
    })
    const html = await renderToString(app)

    expect(html).toContain('data-slot="ai-copilot-trigger"')
    expect(html).toContain('aria-label="Open AI copilot"')
    expect(html).not.toContain('ai-copilot-panel')
  })

  it('asks a question and confirms a proposed action', async () => {
    const fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/messages')) {
        return json({
          conversation: { id: 5, title: 'Mark SO-1 paid' },
          messages: [
            { id: 1, role: 'user', content: JSON.parse(String(init?.body)).message },
            {
              id: 2,
              role: 'action',
              content: 'Paid by wire.',
              action: { label: 'Mark paid', record: 'Order SO-1', status: 'pending', inputs: [] },
            },
            {
              id: 3,
              role: 'assistant',
              content: 'Please confirm.',
              activity: [{ tool: 'read_record', label: 'Read Order SO-1' }],
              usage: { inputTokens: 120, outputTokens: 30, cost: 0.0004 },
            },
          ],
        })
      }

      return json({
        messages: [
          {
            id: 2,
            role: 'action',
            content: 'Paid by wire.',
            action: { label: 'Mark paid', record: 'Order SO-1', status: 'confirmed' },
          },
          { id: 4, role: 'assistant', content: 'Done: Mark paid on Order SO-1.' },
        ],
      })
    })
    vi.stubGlobal('fetch', fetch)

    mountWithAlfakit(() => h(RenderComponent, { component: copilot }))
    await flush()

    document.querySelector<HTMLButtonElement>('[data-slot="ai-copilot-trigger"]')!.click()
    await until(() => document.querySelector('[data-slot="ai-copilot-panel"]') !== null)

    expect(text()).toContain('AI can make mistakes. Check important information.')
    expect(text()).toContain('How can I help?')

    const box = document.querySelector<HTMLTextAreaElement>('[data-slot="ai-composer"] textarea')!
    expect(box.getAttribute('aria-label')).toBe('Ask about your data…')
    box.value = 'Mark SO-1 paid'
    box.dispatchEvent(new Event('input'))
    await flush()
    box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))

    await until(() => text().includes('Waiting for your confirmation'))
    expect(fetch.mock.calls[0]![0]).toBe('/ai/_ai/copilot/messages')
    expect(text()).toContain('Read Order SO-1')
    expect(document.querySelector('[data-slot="ai-usage"]')?.textContent).toContain(
      '150 tokens · ≈ $0.0004',
    )

    const confirm = [
      ...document.querySelectorAll<HTMLButtonElement>('[data-slot="ai-action-card"] button'),
    ].find((button) => button.textContent?.includes('Confirm'))!
    confirm.click()

    await until(() => text().includes('Done: Mark paid on Order SO-1.'))
    expect(fetch.mock.calls[1]![0]).toBe('/ai/_ai/copilot/actions/2/confirm')
    expect(
      document.querySelector('[data-slot="ai-action-card"]')?.getAttribute('data-status'),
    ).toBe('confirmed')
  })

  it('shows the server error and keeps the question', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ message: 'Too many AI requests. Try again in 30 seconds.' }, 429)),
    )

    mountWithAlfakit(() => h(RenderComponent, { component: copilot }))
    await flush()
    document.querySelector<HTMLButtonElement>('[data-slot="ai-copilot-trigger"]')!.click()
    await until(() => document.querySelector('[data-slot="ai-composer"] textarea') !== null)

    const box = document.querySelector<HTMLTextAreaElement>('[data-slot="ai-composer"] textarea')!
    box.value = 'Hello'
    box.dispatchEvent(new Event('input'))
    await flush()
    document
      .querySelector<HTMLFormElement>('[data-slot="ai-composer"]')!
      .dispatchEvent(new Event('submit', { cancelable: true }))

    await until(() => document.querySelector('[data-slot="ai-composer"] [role="alert"]') !== null)
    expect(
      document.querySelector('[data-slot="ai-composer"] [role="alert"]')?.textContent,
    ).toContain('Too many AI requests')
    expect(
      document.querySelector<HTMLTextAreaElement>('[data-slot="ai-composer"] textarea')!.value,
    ).toBe('Hello')
  })

  it('shows the setup notice and labels sample answers', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        json({
          conversation: { id: 7, title: 'search acme' },
          messages: [
            { id: 1, role: 'user', content: 'search acme' },
            { id: 2, role: 'assistant', content: 'I found one record.', demo: true },
          ],
        }),
      ),
    )

    const withNotice: AiCopilotSchema = {
      ...copilot,
      notice: {
        status: 'info',
        heading: "Sample answer — AI isn't configured",
        description: 'These answers are generated locally as examples, not by an AI model.',
      },
    }

    mountWithAlfakit(() => h(RenderComponent, { component: withNotice }))
    await flush()
    document.querySelector<HTMLButtonElement>('[data-slot="ai-copilot-trigger"]')!.click()
    await until(() => document.querySelector('[data-slot="ai-notice"]') !== null)

    const notice = document.querySelector('[data-slot="ai-notice"]')!
    expect(notice.getAttribute('data-status')).toBe('info')
    expect(notice.textContent).toContain("Sample answer — AI isn't configured")

    const box = document.querySelector<HTMLTextAreaElement>('[data-slot="ai-composer"] textarea')!
    box.value = 'search acme'
    box.dispatchEvent(new Event('input'))
    await flush()
    document
      .querySelector<HTMLFormElement>('[data-slot="ai-composer"]')!
      .dispatchEvent(new Event('submit', { cancelable: true }))

    await until(() => text().includes('I found one record.'))
    expect(
      document.querySelector('[data-role="assistant"] [data-ai-sample]')?.textContent,
    ).toContain("Sample answer — AI isn't configured")
  })
})
