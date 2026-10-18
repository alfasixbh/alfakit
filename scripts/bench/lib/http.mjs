/**
 * A sequential HTTP client with a cookie jar (one signed-in session per target), timing
 * each request: TTFB (until the headers), total (until the body is read), body bytes and
 * the gzip size of the body (what the server sends with compression on).
 */
import { performance } from 'node:perf_hooks'
import { gzipSync } from 'node:zlib'

export class Client {
    constructor(base) {
        this.base = base.replace(/\/$/, '')
        this.cookies = new Map()
    }

    cookieHeader() {
        return [...this.cookies.entries()].map(([key, value]) => `${key}=${value}`).join('; ')
    }

    cookie(name) {
        const value = this.cookies.get(name)

        return value === undefined ? undefined : decodeURIComponent(value)
    }

    storeCookies(response) {
        for (const line of response.headers.getSetCookie?.() ?? []) {
            const [pair] = line.split(';')
            const eq = pair.indexOf('=')

            if (eq > 0) this.cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim())
        }
    }

    async request(path, { method = 'GET', headers = {}, body } = {}) {
        const url = path.startsWith('http') ? path : this.base + path
        const started = performance.now()
        const response = await fetch(url, {
            method,
            headers: { cookie: this.cookieHeader(), ...headers },
            body,
            redirect: 'manual',
        })
        const ttfb = performance.now() - started
        const buffer = Buffer.from(await response.arrayBuffer())
        const total = performance.now() - started

        this.storeCookies(response)

        return {
            status: response.status,
            ttfb,
            total,
            bytes: buffer.byteLength,
            gzipBytes: gzipSync(buffer).byteLength,
            text: buffer.toString('utf8'),
            location: response.headers.get('location'),
        }
    }
}

export const decodeEntities = (value) =>
    value
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')

/** The Inertia page object embedded in a full HTML response (v3 script tag, or v2 attribute). */
export function inertiaPage(html) {
    const script = html.match(
        /<script data-page="app" type="application\/json">([\s\S]*?)<\/script>/,
    )

    if (script) return JSON.parse(script[1])

    const attribute = html.match(/data-page="(\{[^"]*)"/)

    if (!attribute) throw new Error('No Inertia page payload found')

    return JSON.parse(decodeEntities(attribute[1]))
}

/** Livewire component snapshots, CSRF token and update URI of a Filament page. */
export function livewireSnapshots(html) {
    const snapshots = []

    for (const match of html.matchAll(/wire:snapshot="([^"]*)"/g)) {
        const raw = decodeEntities(match[1])
        snapshots.push({ raw, parsed: JSON.parse(raw) })
    }

    const csrf = html.match(/data-csrf="([^"]*)"/)?.[1]
    const updateUri = html.match(/data-update-uri="([^"]*)"/)?.[1]

    if (!csrf || !updateUri)
        throw new Error('Livewire script tag (data-csrf / data-update-uri) not found')

    return { snapshots, csrf, updateUri }
}
