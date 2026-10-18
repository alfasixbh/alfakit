import { readFileSync } from 'node:fs'

/**
 * What the benchmark measures, per target. A target is an app serving the benchmark scenarios
 * (the three AlfaKit playgrounds, and optionally the Filament v5 app in benchmarks/filament-app).
 * Each app exposes `GET /benchmark/login` (signs in admin@example.com, local only) and
 * `GET /benchmark/info` (PHP, Laravel, OPcache, debug mode).
 *
 * To benchmark another Filament (or any other) app, add an entry to `TARGETS` with its URL,
 * `kind: 'filament'` (or a new kind with its own `selectors`), and serve the same scenarios:
 * the resource at /admin/benchmark-records, /admin/form-benchmark, /admin/dashboard-benchmark,
 * global search over the records. benchmarks/filament-app is the reference implementation.
 */

/** Selectors per kind of app: AlfaKit renderers share `data-slot` hooks, Filament has its `fi-*` classes. */
export const SELECTORS = {
    alfakit: {
        tableRow: '[data-slot="table-body"] [data-slot="table-row"]',
        field: '[data-slot="field"]',
        repeaterItem: '[data-slot="item-header"]',
        searchOpen: async (page) => {
            await page.keyboard.press('ControlOrMeta+K')
            await page.waitForSelector('[data-slot="command-input"]')

            return '[data-slot="command-input"]'
        },
        searchResult: '[data-slot="command-item"]',
    },
    filament: {
        tableRow: 'tbody tr.fi-ta-row',
        field: '.fi-fo-field',
        repeaterItem: '.fi-fo-repeater-item',
        searchOpen: async () => '.fi-global-search-field input',
        searchResult: '.fi-global-search-result',
    },
}

const playground = (renderer) => ({
    name: renderer,
    label: `AlfaKit (${renderer[0].toUpperCase()}${renderer.slice(1)})`,
    kind: 'alfakit',
    url:
        process.env[`BENCH_${renderer.toUpperCase()}_URL`] ??
        `http://alfakit-${renderer}.localhost`,
    envFile: `playground/${renderer}/.env`,
})

export const TARGETS = [
    playground('react'),
    playground('vue'),
    playground('svelte'),
    {
        name: 'filament',
        label: 'Filament v5',
        kind: 'filament',
        url: process.env.BENCH_FILAMENT_URL ?? 'http://filament-bench.localhost',
        envFile: 'benchmarks/filament-app/.env',
        optional: true,
    },
]

/** The record the global search scenario looks for, and its title (from benchmarks/data/benchmark_records.csv). */
export const SEARCH_TERM = 'SKU-04242'

export const SEARCH_RESULT = (() => {
    const csv = readFileSync(
        new URL('../../benchmarks/data/benchmark_records.csv', import.meta.url),
        'utf8',
    )
    const line = csv.split('\n').find((row) => row.includes(`,${SEARCH_TERM},`))

    return line?.match(/,"([^"]+)",/)?.[1] ?? SEARCH_TERM
})()

/**
 * Scenarios. `path` is loaded on the server and in the browser; `ready(selectors)` returns the
 * condition the browser waits for (the page is usable: rows rendered, fields mounted, every
 * widget loaded); `interaction` measures one user action after the page is ready.
 */
export const SCENARIOS = [
    {
        id: 'list-50',
        label: 'Table, 50 rows, with filters',
        path: '/admin/benchmark-records?perPage=50',
        expect: 'SKU-00050',
        ready: (s) => ({ selector: s.tableRow, count: 50 }),
        interaction: 'sort',
        interactionLabel: 'sort by name',
    },
    {
        id: 'list-500',
        label: 'Table, 500 rows, with filters',
        path: '/admin/benchmark-records?perPage=500',
        expect: 'SKU-00500',
        // AlfaKit virtualises long tables: only the rows in view (about a dozen) are in the DOM.
        ready: (s) => ({ selector: s.tableRow, count: 10 }),
        interaction: 'sort',
        interactionLabel: 'sort by name',
    },
    {
        id: 'form',
        label: 'Form, 100 fields + repeater',
        path: '/admin/form-benchmark',
        expect: 'Value 40',
        ready: (s) => ({
            selector: s.field,
            count: 100,
            also: { selector: s.repeaterItem, count: 10 },
        }),
        interaction: 'live-field',
        interactionLabel: '`live()` field round trip',
    },
    {
        id: 'dashboard',
        label: 'Dashboard, 6 widgets',
        path: '/admin/dashboard-benchmark',
        expect: 'dashboard-benchmark',
        ready: (s) => ({
            selector: 'canvas',
            count: 3,
            also: { selector: s.tableRow, count: 10 },
            text: 'Average rating',
        }),
        interaction: null,
    },
    {
        id: 'search',
        label: 'Global search',
        path: '/admin/benchmark-records?perPage=10',
        expect: 'SKU-00010',
        ready: (s) => ({ selector: s.tableRow, count: 10 }),
        interaction: 'global-search',
        interactionLabel: 'type a SKU until results show',
    },
]
