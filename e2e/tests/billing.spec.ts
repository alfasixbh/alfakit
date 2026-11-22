import { type Browser, type BrowserContext, type Page } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { createHmac } from 'node:crypto'
import { createServer, type IncomingMessage, type Server } from 'node:http'
import { expect, test } from '../fixtures/test'

/**
 * Stripe billing end to end without Stripe (docs: plugins/billing): the plans page, a
 * checkout that is cancelled, one that is paid, the signed webhook that makes the user a
 * subscriber, the billing portal, and Stripe answering with an error.
 *
 * Stripe itself is replaced by a stand-in this spec starts on 127.0.0.1:8140: it answers the
 * API calls Laravel Cashier makes, serves a checkout and a portal page, and sends the webhook
 * a real payment would. The sites run with a made-up key and webhook secret and with Cashier
 * pointed at the stand-in (`E2E_BILLING=1 scripts/e2e-local.sh billing`), so nothing leaves
 * this machine. It proves AlfaKit's and Cashier's side; Stripe's own pages are not in it.
 */

const PASSWORD = 'Billing-e2e-1!'
const WEBHOOK_SECRET = 'whsec_standin'
const PORT = 8140
const STAND_IN = `http://127.0.0.1:${PORT}`

type Call = { method: string; path: string; params: URLSearchParams; key: string }

const playground = (renderer: string): string => `../playground/${renderer}`

const tinker = (renderer: string, code: string): string =>
  execFileSync('php', ['artisan', 'tinker', `--execute=${code}`], {
    cwd: playground(renderer),
    encoding: 'utf8',
  })

function createUser(renderer: string, name: string, email: string): void {
  tinker(
    renderer,
    `$user = \\App\\Models\\User::query()->create(['name' => '${name}', 'email' => '${email}', 'password' => \\Illuminate\\Support\\Facades\\Hash::make('${PASSWORD}')]); $user->forceFill(['email_verified_at' => now()])->save();`,
  )
}

function deleteUser(renderer: string, email: string): void {
  tinker(
    renderer,
    `$user = \\App\\Models\\User::query()->where('email', '${email}')->first(); if ($user) { $user->subscriptions()->get()->each(function ($subscription) { $subscription->items()->delete(); $subscription->delete(); }); $user->delete(); }`,
  )
}

const subscriptions = (renderer: string, email: string): string =>
  tinker(
    renderer,
    `echo json_encode(\\App\\Models\\User::query()->where('email', '${email}')->first()?->subscriptions()->get(['type', 'stripe_id', 'stripe_status', 'stripe_price', 'trial_ends_at'])->all());`,
  ).trim()

async function guestContext(
  browser: Browser,
  baseURL: string | undefined,
): Promise<BrowserContext> {
  const context = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [] } })

  await context.addInitScript(() => {
    const hide = () => {
      const style = document.createElement('style')
      style.textContent =
        '#herd-ai-host { display: none !important; pointer-events: none !important; }'
      document.documentElement.appendChild(style)
    }

    if (document.documentElement) hide()
    else document.addEventListener('DOMContentLoaded', hide)
  })

  return context
}

async function signIn(page: Page, email: string): Promise<void> {
  await page.goto('/admin/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/^password/i).fill(PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page).toHaveURL(/\/admin(\/)?$/)
}

// ---------------------------------------------------------------- the stand-in for Stripe

const readBody = (request: IncomingMessage): Promise<string> =>
  new Promise((resolve) => {
    let body = ''

    request.on('data', (chunk) => (body += chunk))
    request.on('end', () => resolve(body))
  })

const page = (title: string, body: string): string =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title></head><body><main><h1>${title}</h1>${body}</main></body></html>`

class StripeStandIn {
  calls: Call[] = []
  unknown: string[] = []
  webhooks: { status: number; type: string }[] = []
  /** Answer the next checkout session request with a Stripe error. */
  failNextCheckout = false
  private sessions = new Map<string, URLSearchParams>()
  private server: Server | null = null
  private counter = 0

  constructor(private appUrl: () => string) {}

  private id(prefix: string): string {
    return `${prefix}_standin_${Date.now().toString(36)}${(this.counter++).toString(36)}`
  }

  find(method: string, path: string): Call | undefined {
    return [...this.calls].reverse().find((call) => call.method === method && call.path === path)
  }

  reset(): void {
    this.calls = []
    this.unknown = []
    this.webhooks = []
    this.failNextCheckout = false
  }

  async start(): Promise<void> {
    this.server = createServer(async (request, response) => {
      const url = new URL(request.url ?? '/', STAND_IN)
      const method = request.method ?? 'GET'
      const body = await readBody(request)
      const json = (status: number, data: unknown) => {
        response.writeHead(status, {
          'Content-Type': 'application/json',
          'Request-Id': 'req_standin',
        })
        response.end(JSON.stringify(data))
      }
      const html = (content: string) => {
        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        response.end(content)
      }

      // ---- Stripe's API, as Laravel Cashier calls it.
      if (url.pathname.startsWith('/v1/')) {
        const params = new URLSearchParams(method === 'GET' ? url.search : body)
        const key = (request.headers.authorization ?? '').replace(/^Bearer /, '')

        this.calls.push({ method, path: url.pathname, params, key })

        if (method === 'POST' && url.pathname === '/v1/customers') {
          return json(200, {
            id: this.id('cus'),
            object: 'customer',
            email: params.get('email'),
            name: params.get('name'),
          })
        }

        if (/^\/v1\/customers\/[^/]+$/.test(url.pathname)) {
          return json(200, { id: url.pathname.split('/').pop(), object: 'customer' })
        }

        if (method === 'POST' && url.pathname === '/v1/checkout/sessions') {
          if (this.failNextCheckout) {
            this.failNextCheckout = false

            return json(400, {
              error: { type: 'invalid_request_error', message: 'No such price: stand-in refusal' },
            })
          }

          const id = this.id('cs')

          this.sessions.set(id, params)

          return json(200, {
            id,
            object: 'checkout.session',
            mode: params.get('mode'),
            customer: params.get('customer'),
            url: `${STAND_IN}/checkout/${id}`,
          })
        }

        if (method === 'POST' && url.pathname === '/v1/billing_portal/sessions') {
          const returnUrl = params.get('return_url') ?? this.appUrl()

          return json(200, {
            id: this.id('bps'),
            object: 'billing_portal.session',
            customer: params.get('customer'),
            return_url: returnUrl,
            url: `${STAND_IN}/portal?return=${encodeURIComponent(returnUrl)}`,
          })
        }

        this.unknown.push(`${method} ${url.pathname}`)

        return json(404, {
          error: {
            type: 'invalid_request_error',
            message: `The stand-in does not answer ${method} ${url.pathname}`,
          },
        })
      }

      // ---- The hosted pages a customer sees.
      const checkout = /^\/checkout\/([^/]+)(\/pay)?$/.exec(url.pathname)

      if (checkout) {
        const session = this.sessions.get(checkout[1] ?? '')

        if (!session) return json(404, { error: 'unknown session' })

        if (!checkout[2]) {
          return html(
            page(
              'Stand-in checkout',
              `<p>Price: <code>${session.get('line_items[0][price]')}</code></p><form method="post" action="/checkout/${checkout[1]}/pay"><button type="submit">Pay</button></form><p><a href="${session.get('cancel_url')}">Back</a></p>`,
            ),
          )
        }

        // "Pay": Stripe creates the subscription and tells the app with a signed webhook.
        const price = session.get('line_items[0][price]') ?? ''
        const trialDays = Number(session.get('subscription_data[trial_period_days]') ?? 0)
        const trialEnd = session.get('subscription_data[trial_end]')
        const event = {
          id: this.id('evt'),
          object: 'event',
          type: 'customer.subscription.created',
          data: {
            object: {
              id: this.id('sub'),
              object: 'subscription',
              customer: session.get('customer'),
              status: trialDays > 0 || trialEnd ? 'trialing' : 'active',
              trial_end: trialEnd
                ? Number(trialEnd)
                : trialDays > 0
                  ? Math.floor(Date.now() / 1000) + trialDays * 86_400
                  : null,
              metadata: Object.fromEntries(
                [...session.entries()]
                  .filter(([name]) => name.startsWith('subscription_data[metadata]['))
                  .map(([name, value]) => [
                    name.slice('subscription_data[metadata]['.length, -1),
                    value,
                  ]),
              ),
              items: {
                data: [
                  { id: this.id('si'), quantity: 1, price: { id: price, product: 'prod_standin' } },
                ],
              },
            },
          },
        }
        const payload = JSON.stringify(event)
        const timestamp = Math.floor(Date.now() / 1000)
        const signature = createHmac('sha256', WEBHOOK_SECRET)
          .update(`${timestamp}.${payload}`)
          .digest('hex')
        const delivered = await fetch(`${this.appUrl()}/stripe/webhook`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Stripe-Signature': `t=${timestamp},v1=${signature}`,
          },
          body: payload,
        })

        this.webhooks.push({ status: delivered.status, type: event.type })
        response.writeHead(303, { Location: session.get('success_url') ?? this.appUrl() })

        return response.end()
      }

      // The browser asks every site for one.
      if (url.pathname === '/favicon.ico') {
        response.writeHead(204)

        return response.end()
      }

      if (url.pathname === '/portal') {
        return html(
          page(
            'Stand-in billing portal',
            `<p><a href="${url.searchParams.get('return')}">Return</a></p>`,
          ),
        )
      }

      this.unknown.push(`${method} ${url.pathname}`)
      response.writeHead(404)
      response.end()
    })

    await new Promise<void>((resolve) => this.server?.listen(PORT, '127.0.0.1', resolve))
  }

  async stop(): Promise<void> {
    await new Promise<void>((resolve) =>
      this.server ? this.server.close(() => resolve()) : resolve(),
    )
  }
}

// ---------------------------------------------------------------- the journey

test.describe('Stripe billing against a stand-in for Stripe (docs: plugins/billing)', () => {
  test.skip(
    !process.env.E2E_BILLING,
    'set E2E_BILLING=1 (sites whose Cashier talks to the stand-in) to run',
  )

  let appUrl = ''
  const stripe = new StripeStandIn(() => appUrl)

  test.beforeAll(async () => {
    await stripe.start()
  })

  test.afterAll(async () => {
    await stripe.stop()
  })

  test('plans, a cancelled checkout, a paid one, the webhook and the billing portal', async ({
    browser,
    baseURL,
  }, info) => {
    test.setTimeout(120_000)

    const renderer = info.project.name
    const token = Date.now().toString(36)
    const email = `billing-${token}@example.com`

    appUrl = baseURL ?? ''
    stripe.reset()
    createUser(renderer, `Bill Payer ${token}`, email)

    const context = await guestContext(browser, baseURL)
    const page = await context.newPage()
    const plans = () => page.locator('[data-slot="content"]').first()
    const subscribe = (plan: string) =>
      page
        .locator('section, [data-slot="card"]')
        .filter({ has: page.getByRole('heading', { name: plan, exact: true }) })
        .getByRole('link', { name: 'Start free trial', exact: true })

    try {
      await signIn(page, email)

      // The plans page: three plans, the highlighted one marked, each with a trial.
      await page.goto('/admin/billing/plans')
      await expect(page.getByRole('heading', { level: 1, name: 'Choose a plan' })).toBeVisible()
      await expect(plans()).toContainText('Most popular')
      await expect(plans()).toContainText('14-day free trial')
      await expect(page.getByRole('link', { name: 'Start free trial', exact: true })).toHaveCount(3)
      await expect(plans()).not.toContainText('You have an active subscription')

      // Choosing a plan leaves for the checkout the provider answered with.
      await subscribe('Pro').click()
      await expect(page).toHaveURL(new RegExp(`^${STAND_IN}/checkout/cs_standin_`))
      await expect(page.getByRole('heading', { name: 'Stand-in checkout' })).toBeVisible()

      const customer = stripe.find('POST', '/v1/customers')
      const session = stripe.find('POST', '/v1/checkout/sessions')

      expect(customer?.params.get('email')).toBe(email)
      expect(customer?.key).toBe('sk_test_standin')
      expect(session?.params.get('mode')).toBe('subscription')
      expect(session?.params.get('line_items[0][price]')).toBe('price_pro_placeholder')
      expect(
        session?.params.get('subscription_data[trial_period_days]') ??
          session?.params.get('subscription_data[trial_end]'),
      ).toBeTruthy()
      expect(session?.params.get('success_url')).toContain(`${appUrl}/admin`)
      expect(session?.params.get('cancel_url')).toContain(`${appUrl}/admin/billing/plans`)

      // Backing out returns to the plans, with nothing subscribed.
      await page.getByRole('link', { name: 'Back', exact: true }).click()
      await expect(page).toHaveURL(/\/admin\/billing\/plans/)
      await expect(page.getByRole('link', { name: 'Start free trial', exact: true })).toHaveCount(3)
      expect(subscriptions(renderer, email)).toBe('[]')

      // Paying: the signed webhook is accepted and the user is a subscriber.
      await subscribe('Pro').click()
      await expect(page.getByRole('heading', { name: 'Stand-in checkout' })).toBeVisible()
      await page.getByRole('button', { name: 'Pay', exact: true }).click()
      await expect(page).toHaveURL(new RegExp(`^${appUrl}/admin`))
      expect(stripe.webhooks).toEqual([{ status: 200, type: 'customer.subscription.created' }])

      const stored = JSON.parse(subscriptions(renderer, email)) as Record<string, string | null>[]

      expect(stored).toHaveLength(1)
      expect(stored[0]).toMatchObject({
        type: 'default',
        stripe_status: 'trialing',
        stripe_price: 'price_pro_placeholder',
      })
      expect(stored[0]?.trial_ends_at).toBeTruthy()

      // The plans page now offers the portal instead of the plans' buttons.
      await page.goto('/admin/billing/plans')
      await expect(plans()).toContainText('You have an active subscription')
      await expect(page.getByRole('link', { name: 'Start free trial', exact: true })).toHaveCount(0)

      // "Manage billing" opens a portal session for this customer and comes back.
      await page.getByRole('link', { name: 'Manage billing', exact: true }).click()
      await expect(page).toHaveURL(new RegExp(`^${STAND_IN}/portal`))

      const portal = stripe.find('POST', '/v1/billing_portal/sessions')

      expect(portal?.params.get('customer')).toBe(session?.params.get('customer'))
      expect(portal?.params.get('return_url')).toContain(`${appUrl}/admin`)
      await page.getByRole('link', { name: 'Return', exact: true }).click()
      await expect(page).toHaveURL(new RegExp(`^${appUrl}/admin`))

      // The user menu's Billing entry goes to the portal too, now that there is a subscription.
      await page.goto('/admin')
      await page.waitForLoadState('networkidle')
      await page.getByRole('button', { name: /Bill Payer/ }).click()
      await page.getByRole('menuitem', { name: 'Billing', exact: true }).click()
      await expect(page).toHaveURL(new RegExp(`^${STAND_IN}/portal`))

      // Only what Cashier is known to call was asked of the stand-in.
      expect(stripe.unknown).toEqual([])
    } finally {
      await context.close()
      deleteUser(renderer, email)
    }
  })

  test('a refusal from Stripe shows a notice and leaves the user on the plans page', async ({
    browser,
    baseURL,
  }, info) => {
    const renderer = info.project.name
    const token = Date.now().toString(36)
    const email = `billing-refused-${token}@example.com`

    appUrl = baseURL ?? ''
    stripe.reset()
    createUser(renderer, `Bill Refused ${token}`, email)

    const context = await guestContext(browser, baseURL)
    const page = await context.newPage()

    try {
      await signIn(page, email)
      await page.goto('/admin/billing/plans')
      stripe.failNextCheckout = true
      await page.getByRole('link', { name: 'Start free trial', exact: true }).first().click()

      await expect(page.locator('[data-sonner-toast]').first()).toContainText(
        "Payments aren't available right now",
      )
      await expect(page).toHaveURL(/\/admin\/billing\/plans/)
      await expect(page.locator('body')).not.toContainText('stand-in refusal')
      expect(stripe.find('POST', '/v1/checkout/sessions')).toBeTruthy()
      expect(subscriptions(renderer, email)).toBe('[]')

      // A webhook that is not signed with the secret is refused.
      const forged = await page.request.post('/stripe/webhook', {
        data: { id: 'evt_forged', type: 'customer.subscription.created', data: { object: {} } },
        headers: { 'Stripe-Signature': 't=1,v1=00' },
        failOnStatusCode: false,
      })

      expect(forged.status()).toBe(403)
    } finally {
      await context.close()
      deleteUser(renderer, email)
    }
  })
})
