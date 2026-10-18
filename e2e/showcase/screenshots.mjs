#!/usr/bin/env node
/**
 * Captures the screenshots used on the public website (docs/public/screenshots/*.webp) from
 * the demo app, in light and dark, with the installed Google Chrome through Playwright.
 *
 *   pnpm showcase:screenshots                    # everything
 *   pnpm showcase:screenshots dashboard rtl      # only shots whose name starts with these
 *
 * Environment:
 *   DEMO_URL          demo app (default http://alfakit-demo.localhost)
 *   PLAYGROUND_URL    React playground, for the debug panel (default http://alfakit-react.localhost)
 *   DEMO_EMAIL / DEMO_PASSWORD             (default demo@alfakit.dev / password)
 *   PLAYGROUND_EMAIL / PLAYGROUND_PASSWORD (default admin@example.com / password)
 *   BROWSER_CHANNEL   Playwright channel (default chrome)
 *   WEBP_QUALITY      0-1 (default 0.8)
 *
 * Rebuild the renderers (`pnpm build`) and the demo first, so the shots show the current UI.
 * Playwright comes from the e2e workspace this script lives in. The images are
 * encoded to WebP by Chrome itself (canvas), so no image library is needed. The script only
 * changes session flags (theme, locale, layout, mobile preset, tour banner) of its own
 * browser session; it does not create, edit or delete records.
 */
import { chromium } from '@playwright/test'
import { mkdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

const DEMO = (process.env.DEMO_URL ?? 'http://alfakit-demo.localhost').replace(/\/$/, '')
const PLAYGROUND = (process.env.PLAYGROUND_URL ?? 'http://alfakit-react.localhost').replace(
    /\/$/,
    '',
)
const DEMO_LOGIN = {
    email: process.env.DEMO_EMAIL ?? 'demo@alfakit.dev',
    password: process.env.DEMO_PASSWORD ?? 'password',
}
const PLAYGROUND_LOGIN = {
    email: process.env.PLAYGROUND_EMAIL ?? 'admin@example.com',
    password: process.env.PLAYGROUND_PASSWORD ?? 'password',
}
const QUALITY = Number(process.env.WEBP_QUALITY ?? 0.8)
const OUT = process.env.SCREENSHOTS_OUT ?? join(here, '../../docs/public/screenshots')
const DESKTOP = { width: 1440, height: 900 }
const MOBILE = { width: 390, height: 844 }
const THEMES = ['alfakit', 'minimal', 'soft', 'corporate', 'filament']
const only = process.argv.slice(2).filter((arg) => arg !== '--')
const wanted = (name) => only.length === 0 || only.some((prefix) => name.startsWith(prefix))

mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({
    channel: process.env.BROWSER_CHANNEL ?? 'chrome',
    headless: true,
})
// A blank page that turns PNG buffers into WebP with the browser's own encoder.
const encoder = await (await browser.newContext()).newPage()
const written = []

async function save(name, png) {
    const base64 = await encoder.evaluate(
        async ({ data, quality }) => {
            const bytes = Uint8Array.from(atob(data), (char) => char.charCodeAt(0))
            const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }))
            const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
            canvas.getContext('2d').drawImage(bitmap, 0, 0)
            const blob = await canvas.convertToBlob({ type: 'image/webp', quality })
            const buffer = new Uint8Array(await blob.arrayBuffer())
            let binary = ''
            for (let i = 0; i < buffer.length; i += 0x8000) {
                binary += String.fromCharCode(...buffer.subarray(i, i + 0x8000))
            }
            return btoa(binary)
        },
        { data: png.toString('base64'), quality: QUALITY },
    )
    const file = join(OUT, `${name}.webp`)
    writeFileSync(file, Buffer.from(base64, 'base64'))
    const kb = Math.round(statSync(file).size / 1024)
    written.push([name, kb])
    console.log(`  ${name}.webp  ${kb} KB`)
}

/** Waits until the page has settled: network idle, fonts loaded, no running animations. */
async function settle(page) {
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(700)
}

async function visit(page, url) {
    for (let attempt = 0; attempt < 5; attempt++) {
        const response = await page.goto(url)
        // The demo answers 503 for a few seconds while it re-seeds (hourly).
        if (response && response.status() !== 503) break
        await page.waitForTimeout(5000)
    }
    await settle(page)
}

async function shot(page, name, { fullPage = false } = {}) {
    if (!wanted(name)) return
    await save(name, await page.screenshot({ fullPage, animations: 'disabled', caret: 'hide' }))
}

async function context(scheme, viewport = DESKTOP) {
    const ctx = await browser.newContext({
        viewport,
        colorScheme: scheme,
        locale: 'en-US',
        timezoneId: 'Asia/Bahrain',
        deviceScaleFactor: 1,
        // Touch without isMobile: the phone layout at a true 390px layout viewport.
        ...(viewport === MOBILE ? { hasTouch: true } : {}),
    })
    await ctx.addInitScript((appearance) => {
        try {
            localStorage.setItem('alfakit_appearance', appearance)
        } catch {
            // ignore
        }
    }, scheme)
    return ctx
}

async function login(page, base, path, credentials) {
    await visit(page, `${base}${path}/login`)
    await page.getByLabel(/email/i).fill(credentials.email)
    await page.getByLabel(/^password/i).fill(credentials.password)
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL((url) => !url.pathname.endsWith('/login'))
    await settle(page)
}

/** Sets a demo session flag through the demo's own switch routes. */
const flag = (page, path, back) => visit(page, `${DEMO}${path}?back=${encodeURIComponent(back)}`)

async function firstHref(page, pattern) {
    const hrefs = await page.$$eval('a[href]', (links) => links.map((link) => link.href))
    return hrefs.find((href) => pattern.test(new URL(href).pathname))
}

async function reactPanel(scheme) {
    const ctx = await context(scheme)
    const page = await ctx.newPage()
    const admin = '/react/admin'
    await login(page, DEMO, admin, DEMO_LOGIN)
    const home = new URL(page.url()).pathname // /react/admin/{store}
    await flag(page, '/demo/theme/alfakit', home)
    await flag(page, '/demo/tour/dismiss', home)

    await visit(page, `${DEMO}${home}`)
    await shot(page, `dashboard-${scheme}`)

    await visit(page, `${DEMO}${home}/products`)
    await shot(page, `products-table-${scheme}`)

    const edit = await firstHref(page, /\/products\/[^/]+\/edit$/)

    if (wanted(`import-${scheme}`)) {
        await page.getByRole('button', { name: /import products/i }).click()
        await page.getByRole('dialog').waitFor()
        await settle(page)
        await shot(page, `import-${scheme}`)
        await page.keyboard.press('Escape')
    }

    if (wanted(`products-cards-${scheme}`)) {
        await page.getByRole('button', { name: /^cards$/i }).click()
        await settle(page)
        await shot(page, `products-cards-${scheme}`)
        await page.getByRole('button', { name: /^table$/i }).click()
        await settle(page)
    }

    if (edit) {
        await visit(page, edit)
        await shot(page, `product-edit-${scheme}`)
    }

    await visit(page, `${DEMO}${home}/orders/create`)
    await shot(page, `order-wizard-${scheme}`)

    await visit(page, `${DEMO}${home}/orders`)
    // Rows link to the edit page; the view page (with the timeline) is the same URL without
    // /edit. Of the first few orders, the one with the longest timeline is captured.
    if (wanted(`order-view-${scheme}`)) {
        const hrefs = await page.$$eval('a[href]', (links) => links.map((link) => link.href))
        const orders = [...new Set(hrefs.filter((href) => /\/orders\/[^/]+\/edit$/.test(href)))]
        let best = null
        for (const href of orders.slice(0, 8)) {
            const url = href.replace(/\/edit$/, '')
            await visit(page, url)
            const rows = await page.getByText(/^Note$/).count()
            if (!best || rows > best.rows) best = { url, rows }
        }
        if (best) {
            await visit(page, best.url)
            await shot(page, `order-view-${scheme}`)
        }
    }

    await visit(page, `${DEMO}${home}/customers`)
    await shot(page, `customers-${scheme}`)

    await visit(page, `${DEMO}${home}/reports`)
    await shot(page, `reports-${scheme}`)

    if (scheme === 'light') {
        for (const theme of THEMES) {
            if (!wanted(`theme-${theme}`)) continue
            await flag(page, `/demo/theme/${theme}`, `${home}/products`)
            await shot(page, `theme-${theme}-${scheme}`)
        }
        await flag(page, '/demo/theme/alfakit', home)
    }

    if (wanted(`rtl-${scheme}`)) {
        await flag(page, '/demo/locale/ar', home)
        await shot(page, `rtl-${scheme}`)
        await flag(page, '/demo/locale/en', home)
    }

    await ctx.close()
}

async function mobile(scheme) {
    if (!wanted('mobile')) return
    const ctx = await context(scheme, MOBILE)
    const page = await ctx.newPage()
    await login(page, DEMO, '/react/admin', DEMO_LOGIN)
    const home = new URL(page.url()).pathname
    await flag(page, '/demo/tour/dismiss', home)
    await flag(page, '/demo/mobile/on', home)
    await shot(page, `mobile-dashboard-${scheme}`)
    await visit(page, `${DEMO}${home}/products`)
    await shot(page, `mobile-products-${scheme}`)
    await flag(page, '/demo/mobile/off', home)
    await ctx.close()
}

/** The same products list in the Vue and Svelte panels, for the "three frameworks" tabs. */
async function otherRenderers(scheme) {
    for (const renderer of ['vue', 'svelte']) {
        if (!wanted(`${renderer}-`)) continue
        const ctx = await context(scheme)
        const page = await ctx.newPage()
        await login(page, DEMO, `/${renderer}/admin`, DEMO_LOGIN)
        const home = new URL(page.url()).pathname
        await flag(page, '/demo/theme/alfakit', home)
        await visit(page, `${DEMO}${home}/products`)
        await shot(page, `${renderer}-products-${scheme}`)
        await ctx.close()
    }
}

async function storefront(scheme) {
    if (!wanted('storefront')) return
    const ctx = await context(scheme)
    const page = await ctx.newPage()
    await visit(page, `${DEMO}/react`)
    await shot(page, `storefront-${scheme}`)
    await ctx.close()
}

/** The debug panel is a local development tool, so it is captured in the React playground. */
async function debugPanel(scheme) {
    if (!wanted('debug')) return
    const ctx = await context(scheme)
    const page = await ctx.newPage()
    await login(page, PLAYGROUND, '/admin', PLAYGROUND_LOGIN)
    const categories = await firstHref(page, /\/admin\/categories$/)
    await visit(page, categories ?? `${PLAYGROUND}/admin`)
    await page.getByRole('button', { name: /open debug panel/i }).click()
    await settle(page)
    await shot(page, `debug-${scheme}`)
    await ctx.close()
}

try {
    for (const scheme of ['light', 'dark']) {
        console.log(`\n${scheme}`)
        await reactPanel(scheme)
        await mobile(scheme)
        await otherRenderers(scheme)
        await storefront(scheme)
        await debugPanel(scheme)
    }
} finally {
    await browser.close()
}

const total = written.reduce((sum, [, kb]) => sum + kb, 0)
console.log(`\n${written.length} images, ${(total / 1024).toFixed(1)} MB in ${OUT}`)
