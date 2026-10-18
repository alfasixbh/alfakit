/**
 * Shared logic of the Showcase group's custom components, so the React, Vue and Svelte
 * versions only differ by template: the Performance readout (Resource Timing API) and
 * the stock meter column.
 */
import type { SchemaComponent } from '@alfakit/core'

export interface PerfReadoutSettings {
    rows: number
    items: number
    docsUrl: string
}

/** `View::make('demo-perf-readout')->props([...])` as the renderer passes it. */
export type PerfReadoutComponent = SchemaComponent & { props?: PerfReadoutSettings | null }

export const PERF_DEFAULTS: PerfReadoutSettings = { rows: 10000, items: 500, docsUrl: '#' }

export interface Transfer {
    /** Bytes over the wire; null when the browser hides it (cross-origin, cache). */
    size: number | null
    /** Milliseconds, start to response end. */
    duration: number
    /** Milliseconds reported by the `Server-Timing: alfakit;dur=…` header, when sent. */
    server: number | null
}

export interface InternalRequest extends Transfer {
    id: string
    /** `_alfakit/actions`, `_alfakit/table`, or the page path of an Inertia visit. */
    kind: string
    at: number
}

function serverTiming(entry: PerformanceResourceTiming): number | null {
    const alfakit = (entry.serverTiming ?? []).find((timing) => timing.name === 'alfakit')

    return alfakit ? Math.round(alfakit.duration * 10) / 10 : null
}

function transferSize(entry: PerformanceResourceTiming): number | null {
    return entry.transferSize > 0
        ? entry.transferSize
        : entry.encodedBodySize > 0
          ? entry.encodedBodySize
          : null
}

/** The document itself (the Inertia page as JSON lives inside it). */
export function measurePage(): Transfer | null {
    if (typeof performance === 'undefined') return null

    const [navigation] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]

    if (!navigation) return null

    return {
        size: transferSize(navigation),
        duration: Math.round(navigation.responseEnd - navigation.startTime),
        server: serverTiming(navigation),
    }
}

function isPageRequest(entry: PerformanceResourceTiming): boolean {
    return (
        entry.name.startsWith(location.origin) &&
        !entry.name.includes('/build/') &&
        (entry.name.includes('/_alfakit/') ||
            entry.initiatorType === 'fetch' ||
            entry.initiatorType === 'xmlhttprequest')
    )
}

function toInternalRequest(entry: PerformanceResourceTiming): InternalRequest {
    const url = new URL(entry.name)
    const internal = url.pathname.split('/_alfakit/')[1]

    return {
        id: `${entry.startTime}-${entry.name}`,
        kind: internal
            ? `_alfakit/${internal.split('/')[0] || 'request'}`
            : `${url.pathname.split('/').slice(-1)[0] || 'page'}${url.search ? '?…' : ''}`,
        size: transferSize(entry),
        duration: Math.round(entry.duration),
        server: serverTiming(entry),
        at: entry.startTime,
    }
}

// A panel page loads hundreds of icon chunks, which fills the browser's resource timing
// buffer (250 entries by default) before the first interaction: the observer keeps its own
// list of the requests that matter, so later entries are never lost.
const seen = new Map<string, InternalRequest>()

/**
 * Watch the requests the page makes after loading: internal endpoints (`/_alfakit/*`) and
 * Inertia visits (sorting, paging and live refreshes are same-origin `fetch` calls); static
 * assets are left out. Returns a function that stops watching.
 */
export function observeRequests(onChange: () => void): () => void {
    if (typeof PerformanceObserver === 'undefined' || typeof performance === 'undefined') {
        return () => undefined
    }

    performance.setResourceTimingBufferSize(2000)

    const observer = new PerformanceObserver((list) => {
        let changed = false

        for (const entry of list.getEntries() as PerformanceResourceTiming[]) {
            if (!isPageRequest(entry)) continue

            const request = toInternalRequest(entry)

            if (!seen.has(request.id)) {
                seen.set(request.id, request)
                changed = true
            }
        }

        if (changed) onChange()
    })

    observer.observe({ type: 'resource', buffered: true })

    return () => observer.disconnect()
}

/** The latest requests the page made after loading, newest first. */
export function measureInternalRequests(limit = 6): InternalRequest[] {
    if (typeof performance === 'undefined' || typeof location === 'undefined') return []

    for (const entry of performance.getEntriesByType('resource') as PerformanceResourceTiming[]) {
        if (!isPageRequest(entry)) continue

        const request = toInternalRequest(entry)

        if (!seen.has(request.id)) seen.set(request.id, request)
    }

    return [...seen.values()].sort((a, b) => b.at - a.at).slice(0, limit)
}

/** `12.4 kB` style, from the formatter's number method so separators follow the locale. */
export function formatBytes(
    bytes: number | null,
    number: (value: number, options?: Intl.NumberFormatOptions) => string,
    unknown: string,
): string {
    if (bytes === null) return unknown
    if (bytes < 1024) return `${number(bytes)} B`
    if (bytes < 1024 * 1024) return `${number(bytes / 1024, { maximumFractionDigits: 1 })} kB`

    return `${number(bytes / (1024 * 1024), { maximumFractionDigits: 2 })} MB`
}

export function formatMs(
    ms: number | null,
    number: (value: number, options?: Intl.NumberFormatOptions) => string,
    unknown: string,
): string {
    return ms === null ? unknown : `${number(ms, { maximumFractionDigits: ms < 10 ? 1 : 0 })} ms`
}

// ------------------------------------------------------------------ Stock meter column

export interface StockMeterProps {
    state?: unknown
    stock?: number
    max?: number
    low?: number
}

export interface StockLevel {
    percent: number
    tone: 'out' | 'low' | 'ok' | 'high'
}

export function stockLevel({ state, stock, max = 120, low = 15 }: StockMeterProps): StockLevel {
    const value = Number(stock ?? state ?? 0)
    const percent = Math.max(0, Math.min(100, Math.round((value / Math.max(max, 1)) * 100)))

    if (value <= 0) return { percent: 0, tone: 'out' }
    if (value <= low) return { percent, tone: 'low' }
    if (value >= max * 0.8) return { percent, tone: 'high' }

    return { percent, tone: 'ok' }
}

export const STOCK_TONE_CLASSES: Record<StockLevel['tone'], string> = {
    out: 'bg-destructive',
    low: 'bg-warning',
    ok: 'bg-primary',
    high: 'bg-success',
}
