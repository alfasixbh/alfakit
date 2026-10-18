#!/usr/bin/env node
/*
 * AlfaKit vs Filament benchmark driver. See README.md for the methodology.
 *
 *   node benchmarks/run.mjs [--runs 20] [--warmup 3] [--label name] [--only alfakit|filament]
 *
 * Env: ALFAKIT_URL (default http://alfakit-react.localhost), FILAMENT_URL (default http://filament-bench.localhost).
 * Writes benchmarks/results/<date>-<label>.json and prints a summary table.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const option = (name, fallback) => {
    const index = args.indexOf(`--${name}`)
    return index === -1 ? fallback : args[index + 1]
}

const RUNS = Number(option('runs', 20))
const WARMUP = Number(option('warmup', 3))
const LABEL = option('label', 'run')
const ONLY = option('only', null)
const ALFAKIT_URL = process.env.ALFAKIT_URL ?? 'http://alfakit-react.localhost'
const FILAMENT_URL = process.env.FILAMENT_URL ?? 'http://filament-bench.localhost'

// ------------------------------------------------------------------ HTTP helpers

class Client {
    constructor(base) {
        this.base = base
        this.cookies = new Map()
    }

    cookieHeader() {
        return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
    }

    storeCookies(response) {
        for (const line of response.headers.getSetCookie?.() ?? []) {
            const [pair] = line.split(';')
            const eq = pair.indexOf('=')
            if (eq > 0) this.cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim())
        }
    }

    cookie(name) {
        const value = this.cookies.get(name)
        return value === undefined ? undefined : decodeURIComponent(value)
    }

    /** One timed request: ttfb = until headers, total = until the body is read, bytes = body size. */
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
        const text = await response.text()
        const total = performance.now() - started
        this.storeCookies(response)

        return {
            status: response.status,
            ttfb,
            total,
            bytes: Buffer.byteLength(text),
            text,
            location: response.headers.get('location'),
        }
    }
}

const decodeEntities = (value) =>
    value
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')

// ------------------------------------------------------------------ Stats

const quantile = (sorted, q) => {
    if (sorted.length === 0) return null
    const position = (sorted.length - 1) * q
    const lower = Math.floor(position)
    const upper = Math.ceil(position)
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower)
}

const summarize = (values) => {
    const sorted = [...values].sort((a, b) => a - b)
    return {
        n: sorted.length,
        min: round(sorted[0]),
        median: round(quantile(sorted, 0.5)),
        p95: round(quantile(sorted, 0.95)),
        max: round(sorted[sorted.length - 1]),
        mean: round(sorted.reduce((a, b) => a + b, 0) / sorted.length),
    }
}

const round = (value) => (value === null ? null : Math.round(value * 100) / 100)

/**
 * Warm up, then run `fn` RUNS times. `fn` returns a timed response; `check` validates it
 * so a broken scenario fails loudly instead of recording error pages.
 */
async function measure(results, framework, scenario, fn, check) {
    for (let i = 0; i < WARMUP; i++) {
        const response = await fn()
        check(response)
    }

    const samples = []
    for (let i = 0; i < RUNS; i++) {
        const response = await fn()
        check(response)
        samples.push({ ttfb: response.ttfb, total: response.total, bytes: response.bytes })
    }

    const entry = {
        framework,
        scenario,
        runs: RUNS,
        ttfb_ms: summarize(samples.map((s) => s.ttfb)),
        total_ms: summarize(samples.map((s) => s.total)),
        bytes: summarize(samples.map((s) => s.bytes)),
        samples,
    }
    results.push(entry)
    console.log(
        `${framework.padEnd(8)} ${scenario.padEnd(22)} ttfb med ${String(entry.ttfb_ms.median).padStart(8)} ms  p95 ${String(entry.ttfb_ms.p95).padStart(8)} ms   total med ${String(entry.total_ms.median).padStart(8)} ms   size ${formatBytes(entry.bytes.median)}`,
    )
    return entry
}

const formatBytes = (bytes) =>
    bytes >= 1024 * 1024
        ? `${(bytes / 1024 / 1024).toFixed(2)} MB`
        : `${(bytes / 1024).toFixed(1)} KB`

const expectStatus = (expected, label) => (response) => {
    if (response.status !== expected) {
        throw new Error(
            `${label}: expected HTTP ${expected}, got ${response.status}\n${response.text.slice(0, 500)}`,
        )
    }
}

const expectContains = (expected, needle, label) => (response) => {
    expectStatus(expected, label)(response)
    if (!response.text.includes(needle)) {
        throw new Error(`${label}: response does not contain "${needle}"`)
    }
}

// ------------------------------------------------------------------ AlfaKit (Inertia)

function inertiaPage(html) {
    // Inertia v3 embeds the page object in <script data-page="app" type="application/json">.
    const script = html.match(
        /<script data-page="app" type="application\/json">([\s\S]*?)<\/script>/,
    )
    if (script) return JSON.parse(script[1])
    // Inertia v2: a data-page attribute on the root element.
    const attribute = html.match(/data-page="(\{[^"]*)"/)
    if (!attribute) throw new Error('No Inertia page payload found')
    return JSON.parse(decodeEntities(attribute[1]))
}

const findKey = (value, key) => {
    if (value === null || typeof value !== 'object') return undefined
    if (key in value) return value[key]
    for (const child of Object.values(value)) {
        const found = findKey(child, key)
        if (found !== undefined) return found
    }
    return undefined
}

async function benchmarkAlfakit(results, meta) {
    const client = new Client(ALFAKIT_URL)
    const login = await client.request('/benchmark/login')
    if (login.status !== 302) throw new Error(`AlfaKit login failed: HTTP ${login.status}`)

    const list = '/admin/benchmark-records'
    const first = await client.request(list)
    expectContains(200, 'SKU-00001', 'AlfaKit list')(first)
    const page = inertiaPage(first.text)
    const version = page.version
    meta.alfakit = { ssr: first.text.includes('data-slot="content"'), inertiaVersion: version }

    await measure(
        results,
        'alfakit',
        'list_25_html',
        () => client.request(list),
        expectContains(200, 'SKU-00025', 'AlfaKit list 25'),
    )
    await measure(
        results,
        'alfakit',
        'list_100_html',
        () => client.request(`${list}?perPage=100`),
        expectContains(200, 'SKU-00100', 'AlfaKit list 100'),
    )

    const partial = {
        Accept: 'text/html, application/xhtml+xml',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Inertia': 'true',
        'X-Inertia-Version': version,
        'X-Inertia-Partial-Component': page.component,
        'X-Inertia-Partial-Data': 'page',
    }

    await measure(
        results,
        'alfakit',
        'sort_partial_reload',
        () => client.request(`${list}?sort=name&direction=asc`, { headers: partial }),
        expectContains(200, '"direction":"asc"', 'AlfaKit sort'),
    )
    await measure(
        results,
        'alfakit',
        'search_partial_reload',
        () => client.request(`${list}?search=alpha`, { headers: partial }),
        expectContains(200, '"search":"alpha"', 'AlfaKit search'),
    )

    for (const items of [100, 500]) {
        const formUrl = `/admin/repeater-benchmark?items=${items}`
        const formResponse = await client.request(formUrl)
        expectContains(200, `Line item ${items}`, `AlfaKit form ${items}`)(formResponse)
        const formPage = inertiaPage(formResponse.text)
        const form = formPage.props.page.content.find((block) => block.type === 'Form')
        const refreshUrl = findKey(formPage.props, 'schemaRefresh')
        if (!form || !refreshUrl)
            throw new Error('AlfaKit form block or schemaRefresh endpoint not found')

        await measure(
            results,
            'alfakit',
            `form_${items}_html`,
            () => client.request(formUrl),
            expectContains(200, `Line item ${items}`, 'AlfaKit form'),
        )

        const body = JSON.stringify({
            token: formPage.props.page.token,
            component: 'form',
            state: { ...form.state, title: 'Order #2' },
            path: 'title',
            old: form.state.title,
            fingerprints: form.fingerprints ?? undefined,
        })

        await measure(
            results,
            'alfakit',
            `live_update_${items}`,
            () =>
                client.request(refreshUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-XSRF-TOKEN': client.cookie('XSRF-TOKEN'),
                    },
                    body,
                }),
            expectContains(200, 'ORDER #2', 'AlfaKit live update'),
        )
        results.at(-1).request_bytes = Buffer.byteLength(body)
    }
}

// ------------------------------------------------------------------ Filament (Livewire)

function livewireSnapshots(html) {
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

async function benchmarkFilament(results, meta) {
    const client = new Client(FILAMENT_URL)
    const login = await client.request('/benchmark/login')
    if (login.status !== 302) throw new Error(`Filament login failed: HTTP ${login.status}`)

    const list = '/admin/benchmark-records'
    const first = await client.request(list)
    expectContains(200, 'SKU-00001', 'Filament list')(first)
    const { snapshots, csrf, updateUri } = livewireSnapshots(first.text)
    const listSnapshot = snapshots.find((s) =>
        s.parsed.memo?.name?.includes('ListBenchmarkRecords'),
    )
    if (!listSnapshot) throw new Error('Filament list component snapshot not found')
    meta.filament = { livewireComponents: snapshots.length, updateUri }

    await measure(
        results,
        'filament',
        'list_25_html',
        () => client.request(list),
        expectContains(200, 'SKU-00025', 'Filament list 25'),
    )
    await measure(
        results,
        'filament',
        'list_100_html',
        () => client.request(`${list}?perPage=100`),
        expectContains(200, 'SKU-00100', 'Filament list 100'),
    )

    const livewire = (snapshot, updates, calls) => {
        const body = JSON.stringify({
            _token: csrf,
            components: [{ snapshot: snapshot.raw, updates, calls }],
        })
        return client.request(updateUri, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-Livewire': '',
            },
            body,
        })
    }

    await measure(
        results,
        'filament',
        'sort_livewire',
        () =>
            livewire(listSnapshot, {}, [
                { path: '', method: 'sortTable', params: ['name', 'asc'] },
            ]),
        expectContains(200, 'name:asc', 'Filament sort'),
    )
    await measure(
        results,
        'filament',
        'search_livewire',
        () => livewire(listSnapshot, { tableSearch: 'alpha' }, []),
        expectContains(200, 'alpha', 'Filament search'),
    )

    for (const items of [100, 500]) {
        const formUrl = `/admin/repeater-benchmark?items=${items}`
        const formResponse = await client.request(formUrl)
        expectContains(200, `Line item ${items}`, `Filament form ${items}`)(formResponse)
        const formSnapshot = livewireSnapshots(formResponse.text).snapshots.find((s) =>
            s.parsed.memo?.name?.includes('RepeaterBenchmark'),
        )
        if (!formSnapshot) throw new Error('Filament form component snapshot not found')

        await measure(
            results,
            'filament',
            `form_${items}_html`,
            () => client.request(formUrl),
            expectContains(200, `Line item ${items}`, 'Filament form'),
        )

        await measure(
            results,
            'filament',
            `live_update_${items}`,
            () => livewire(formSnapshot, { 'data.title': 'Order #2' }, []),
            expectContains(200, 'ORDER #2', 'Filament live update'),
        )
        results.at(-1).request_bytes = Buffer.byteLength(
            JSON.stringify({
                _token: csrf,
                components: [{ snapshot: formSnapshot.raw, updates: {}, calls: [] }],
            }),
        )
    }
}

// ------------------------------------------------------------------ Main

const results = []
const meta = {
    date: new Date().toISOString(),
    label: LABEL,
    runs: RUNS,
    warmup: WARMUP,
    node: process.version,
    urls: { alfakit: ALFAKIT_URL, filament: FILAMENT_URL },
}

if (ONLY !== 'filament') await benchmarkAlfakit(results, meta)
if (ONLY !== 'alfakit') await benchmarkFilament(results, meta)

const here = dirname(fileURLToPath(import.meta.url))
mkdirSync(join(here, 'results'), { recursive: true })
const file = join(here, 'results', `${meta.date.slice(0, 10)}-${LABEL}.json`)
writeFileSync(file, JSON.stringify({ meta, results }, null, 2))
console.log(`\nWrote ${file}`)
