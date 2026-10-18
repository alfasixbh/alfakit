#!/usr/bin/env node
/**
 * Records the showcase clips of the first-party plugins from the live demo: for each plugin
 * (its `extra.alfakit.showcase` manifest in packages/plugins/<slug>/composer.json), each
 * renderer and each theme, a short muted tour of the plugin's demo page.
 *
 *   pnpm showcase:record                                   # every plugin, react+vue+svelte, light+dark
 *   pnpm showcase:record --plugins=kanban,cms --renderers=react --themes=dark
 *   ALFAKIT_DEMO_URL=https://demo.alfakit.dev pnpm showcase:record
 *
 * Output: docs/public/showcase/<slug>/<renderer>-<theme>.webm (VP9, 960 px wide, ~8 s) and a
 * poster .png of the first frame. Frames come from Chrome's screencast (CDP) once the page
 * has loaded, and Playwright's bundled ffmpeg encodes them, so no other tools are needed.
 * Sign-in: demo@alfakit.dev / password.
 */
import { chromium } from '@playwright/test'
import { execFileSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const args = Object.fromEntries(
    process.argv
        .slice(2)
        .filter((arg) => arg.startsWith('--'))
        .map((arg) => {
            const [key, value = 'true'] = arg.slice(2).split('=')
            return [key, value]
        }),
)
const list = (value, fallback) => (value ? value.split(',').map((item) => item.trim()) : fallback)

const BASE = (args.base ?? process.env.ALFAKIT_DEMO_URL ?? 'http://alfakit-demo.localhost').replace(
    /\/$/,
    '',
)
const TENANT = args.tenant ?? process.env.ALFAKIT_DEMO_TENANT ?? 'manama'
const OUT = resolve(root, args.out ?? 'docs/public/showcase')
const RENDERERS = list(args.renderers, ['react', 'vue', 'svelte'])
const THEMES = list(args.themes, ['light', 'dark'])
const SECONDS = Number(args.seconds ?? 8)
const WIDTH = Number(args.width ?? 960)
const CONCURRENCY = Number(args.concurrency ?? 3)
const POSTER_WIDTH = Number(args['poster-width'] ?? 640)
const CREDENTIALS = { email: 'demo@alfakit.dev', password: 'password' }
const VIEWPORT = { width: 1280, height: 720 }
const FPS = 25
/** Where the pointer rests when a clip starts: over content, away from buttons. */
const START = { x: VIEWPORT.width * 0.62, y: VIEWPORT.height * 0.78 }

/** The plugins and their manifests. */
function manifests() {
    const only = list(args.plugins, null)
    const directory = join(root, 'packages/plugins')

    return readdirSync(directory)
        .filter((slug) => existsSync(join(directory, slug, 'composer.json')))
        .filter((slug) => !only || only.includes(slug))
        .map((slug) => {
            const composer = JSON.parse(
                readFileSync(join(directory, slug, 'composer.json'), 'utf8'),
            )
            return { slug, showcase: composer.extra?.alfakit?.showcase }
        })
        .filter((plugin) => plugin.showcase?.demoPath)
}

/** Playwright's own ffmpeg build (VP9 in WebM, PNG, scale), so nothing else is needed. */
function ffmpeg() {
    if (process.env.FFMPEG) return process.env.FFMPEG

    const cache =
        process.env.PLAYWRIGHT_BROWSERS_PATH ??
        (process.platform === 'darwin'
            ? join(homedir(), 'Library/Caches/ms-playwright')
            : process.platform === 'win32'
              ? join(homedir(), 'AppData/Local/ms-playwright')
              : join(homedir(), '.cache/ms-playwright'))

    for (const entry of existsSync(cache) ? readdirSync(cache) : []) {
        if (!entry.startsWith('ffmpeg')) continue

        for (const binary of ['ffmpeg-mac', 'ffmpeg-linux', 'ffmpeg-win64.exe']) {
            const path = join(cache, entry, binary)
            if (existsSync(path)) return path
        }
    }

    throw new Error('No ffmpeg found: run `npx playwright install ffmpeg` or set FFMPEG.')
}

/**
 * Plugin-specific moves on top of the generic tour (slow scroll down and back up). Each is
 * best effort: a selector that is missing just skips the step.
 */
const MOVES = {
    calendar: [{ click: 'button:has-text("Week"), .fc-timeGridWeek-button' }],
    kanban: [{ hover: '[data-kanban-card], [data-slot="kanban-card"]' }],
    comments: [{ scrollTo: 'text=/comments/i' }],
    helpdesk: [
        { click: 'button:has-text("All open"), a:has-text("All open")' },
        { click: '[role="listbox"] [role="option"], [data-slot="helpdesk-ticket"]' },
    ],
    tree: [{ hover: '[role="treeitem"]' }],
    'feature-flags': [{ hover: 'table tbody tr' }],
    'file-manager': [{ hover: '[data-file-manager-entry], table tbody tr' }],
    analytics: [{ hover: 'canvas' }],
}

/**
 * Chrome's screencast frames (JPEG), sampled at a constant frame rate into ffmpeg, which
 * writes a small VP9 WebM.
 */
async function startRecording(page, output, ffmpegPath) {
    const session = await page.context().newCDPSession(page)
    const encoder = spawn(
        ffmpegPath,
        [
            '-y',
            '-loglevel',
            'error',
            '-f',
            'image2pipe',
            '-framerate',
            String(FPS),
            '-c:v',
            'mjpeg',
            '-i',
            'pipe:0',
            '-vf',
            `scale=${WIDTH}:-2`,
            '-c:v',
            'libvpx-vp9',
            '-crf',
            '42',
            '-b:v',
            '0',
            '-deadline',
            'good',
            '-cpu-used',
            '4',
            '-pix_fmt',
            'yuv420p',
            '-an',
            output,
        ],
        { stdio: ['pipe', 'ignore', 'inherit'] },
    )
    // Settles with an error instead of rejecting, so a failed encoder never goes unhandled.
    const finished = new Promise((resolvePromise) => {
        encoder.on('error', (error) => resolvePromise(error))
        encoder.on('close', (code) =>
            resolvePromise(code === 0 ? null : new Error(`ffmpeg exited with ${code}`)),
        )
    })
    encoder.stdin.on('error', () => {})
    let frame = null

    session.on('Page.screencastFrame', ({ data, sessionId }) => {
        frame = Buffer.from(data, 'base64')
        session.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
    })
    await session.send('Page.startScreencast', {
        format: 'jpeg',
        quality: 90,
        maxWidth: VIEWPORT.width,
        maxHeight: VIEWPORT.height,
    })

    const timer = setInterval(() => {
        if (frame && encoder.stdin.writable) encoder.stdin.write(frame)
    }, 1000 / FPS)

    return async () => {
        clearInterval(timer)
        await session.send('Page.stopScreencast').catch(() => {})
        encoder.stdin.end()
        const error = await finished
        if (error) throw error
    }
}

async function cursor(page) {
    // A visible pointer: the recorded video has none.
    await page.addInitScript(() => {
        window.addEventListener('DOMContentLoaded', () => {
            const dot = document.createElement('div')
            dot.setAttribute('aria-hidden', 'true')
            dot.style.cssText =
                'position:fixed;z-index:2147483647;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:9999px;background:rgb(244 122 34/.55);border:2px solid #fff;box-shadow:0 1px 4px rgb(0 0 0/.35);pointer-events:none;transition:transform .12s;left:-40px;top:-40px'
            document.body.appendChild(dot)
            window.addEventListener('mousemove', (event) => {
                dot.style.left = `${event.clientX}px`
                dot.style.top = `${event.clientY}px`
            })
            window.addEventListener('mousedown', () => (dot.style.transform = 'scale(.7)'))
            window.addEventListener('mouseup', () => (dot.style.transform = ''))
        })
    })
}

async function glide(page, from, to, steps = 25) {
    for (let step = 1; step <= steps; step++) {
        await page.mouse.move(
            from.x + ((to.x - from.x) * step) / steps,
            from.y + ((to.y - from.y) * step) / steps,
        )
        await page.waitForTimeout(16)
    }
}

async function tour(page, slug) {
    const center = { x: VIEWPORT.width / 2, y: VIEWPORT.height / 2 }
    await glide(page, START, center)
    await page.waitForTimeout(500)

    for (const move of MOVES[slug] ?? []) {
        try {
            const selector = move.click ?? move.hover ?? move.scrollTo
            const target = page.locator(selector).first()
            if (!(await target.count())) continue

            if (move.scrollTo) {
                await target.scrollIntoViewIfNeeded({ timeout: 1500 })
                await page.waitForTimeout(800)
                continue
            }

            const box = await target.boundingBox({ timeout: 1500 })
            if (!box) continue
            await glide(page, center, { x: box.x + box.width / 2, y: box.y + box.height / 2 }, 20)
            if (move.click) await target.click({ timeout: 1500 })
            await page.waitForTimeout(900)
        } catch {
            // Best effort.
        }
    }

    // Scroll down and back up, but only as far as the page goes (never into an empty footer).
    const room = await page.evaluate(() => {
        const scroller = document.scrollingElement ?? document.documentElement
        return Math.max(0, scroller.scrollHeight - window.innerHeight)
    })
    const steps = Math.min(8, Math.floor((room * 0.7) / 70))
    for (let i = 0; i < steps; i++) {
        await page.mouse.wheel(0, 70)
        await page.waitForTimeout(120)
    }
    await page.waitForTimeout(900)
    for (let i = 0; i < steps; i++) {
        await page.mouse.wheel(0, -70)
        await page.waitForTimeout(100)
    }
}

async function signIn(browser, renderer) {
    const context = await browser.newContext({ viewport: VIEWPORT })
    const page = await context.newPage()
    await page.goto(`${BASE}/${renderer}/admin/login`)
    await page.getByLabel(/email/i).first().fill(CREDENTIALS.email)
    await page
        .getByLabel(/^password/i)
        .first()
        .fill(CREDENTIALS.password)
    await page
        .getByRole('button', { name: /sign in|log in/i })
        .first()
        .click()
    await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 30_000 })
    const state = await context.storageState()
    await context.close()

    return state
}

async function record(browser, state, plugin, renderer, theme, ffmpegPath) {
    const directory = join(OUT, plugin.slug)
    const name = `${renderer}-${theme}`
    mkdirSync(directory, { recursive: true })

    const context = await browser.newContext({
        viewport: VIEWPORT,
        colorScheme: theme,
        reducedMotion: 'no-preference',
        storageState: state,
    })
    await context.addCookies([{ name: 'alfakit_appearance', value: theme, url: BASE }])
    await context.addInitScript((value) => {
        try {
            localStorage.setItem('alfakit_appearance', value)
        } catch {
            // Ignore.
        }
    }, theme)

    try {
        const page = await context.newPage()
        await cursor(page)
        const url = `${BASE}/${renderer}/admin/${TENANT}/${plugin.showcase.demoPath}`
        const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 })

        if (!response || response.status() >= 400) {
            throw new Error(`${url} answered ${response?.status()}`)
        }

        if (new URL(page.url()).pathname.endsWith('/login')) {
            throw new Error(`${url} redirected to the login page`)
        }

        await page.waitForTimeout(1000)
        await page.mouse.move(START.x, START.y)

        const video = join(directory, `${name}.webm`)
        const started = Date.now()
        const stop = await startRecording(page, video, ffmpegPath)
        await page.waitForTimeout(600)
        await tour(page, plugin.slug)

        const left = SECONDS * 1000 - (Date.now() - started)
        if (left > 0) await page.waitForTimeout(left)
        await stop()

        // The poster only shows until the clip plays: smaller than the video keeps it light.
        execFileSync(ffmpegPath, [
            '-y',
            '-loglevel',
            'error',
            '-i',
            video,
            '-frames:v',
            '1',
            '-vf',
            `scale=${POSTER_WIDTH}:-2`,
            join(directory, `${name}.png`),
        ])

        return statSync(video).size + statSync(join(directory, `${name}.png`)).size
    } finally {
        await context.close()
    }
}

async function main() {
    const plugins = manifests()
    const ffmpegPath = ffmpeg()
    const browser = await chromium.launch({ channel: process.env.E2E_BROWSER_CHANNEL ?? 'chrome' })
    const jobs = []
    let total = 0
    let failed = 0

    for (const renderer of RENDERERS) {
        const state = await signIn(browser, renderer)

        for (const plugin of plugins) {
            const wanted = plugin.showcase.clips ?? []

            for (const theme of THEMES) {
                if (wanted.length && !wanted.includes(`${renderer}-${theme}`)) continue
                jobs.push({ state, plugin, renderer, theme })
            }
        }
    }

    console.log(`Recording ${jobs.length} clips from ${BASE} into ${OUT}`)

    const queue = [...jobs]
    await Promise.all(
        Array.from({ length: Math.max(1, CONCURRENCY) }, async () => {
            while (queue.length) {
                const job = queue.shift()
                const label = `${job.plugin.slug} ${job.renderer}-${job.theme}`

                try {
                    const size = await record(
                        browser,
                        job.state,
                        job.plugin,
                        job.renderer,
                        job.theme,
                        ffmpegPath,
                    )
                    total += size
                    console.log(`  ✓ ${label} (${Math.round(size / 1024)} KB)`)
                } catch (error) {
                    failed++
                    console.log(
                        `  ✗ ${label}: ${error instanceof Error ? error.message.split('\n')[0] : error}`,
                    )
                }
            }
        }),
    )

    await browser.close()
    console.log(
        `Done: ${jobs.length - failed} clips, ${(total / 1024 / 1024).toFixed(1)} MB${failed ? `, ${failed} failed` : ''}.`,
    )
    process.exitCode = failed ? 1 : 0
}

await main()
