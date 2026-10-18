/**
 * The 1,000,000-row table benchmark: server TTFB and payload of full page loads of the
 * bench_big_records resource (25 rows per page) in the AlfaKit playgrounds (react, vue,
 * svelte) and the Filament app, per pagination mode. Medians of N runs after one warm-up,
 * sequential. Defaults to react and filament.
 *
 *   node scripts/bench/big.mjs [--runs=5] [--targets=react,vue,svelte,filament]
 *       [--panels=bench,admin] [--caches=optimize|none|keep] [--max-load=3] [--keep-debug]
 *
 * AlfaKit is measured on two panels of each playground: `bench` (/bench, the lean panel: only
 * the benchmark resources, no plugins, the middleware of a fresh Filament panel; the like for
 * like comparison with benchmarks/filament-app) and `admin` (/admin, the full playground with
 * every plugin, its navigation and the `web` group).
 *
 * Like `pnpm bench`, APP_DEBUG is set to false (and Inertia's devtools off) in each target's
 * .env for the run and restored afterwards, unless --keep-debug. Inertia's SSR is off for the
 * run too (no SSR server runs; the page is the client-rendered response). Every app gets the
 * same Laravel caches: `--caches=optimize` (default) runs `php artisan optimize` in each app
 * first (config, events, routes, views, and `alfakit:optimize` / `filament:optimize`), `none`
 * clears them; both put every app back afterwards. Each target starts once the one-minute load
 * average is below --max-load (default 3), with one warm-up pass over every scenario.
 *
 * Seed first (every target): php artisan migrate && php artisan db:seed
 *   --class="Database\Seeders\Benchmark\BenchBigRecordsSeeder"
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import { cacheGuard, waitForIdle } from './lib/caches.mjs'
import { debugOffGuard } from './lib/env.mjs'
import { hardware } from './lib/hardware.mjs'
import { serverInfo, signIn } from './lib/server.mjs'
import { formatBytes, round, summarize } from './lib/stats.mjs'
import { TARGETS } from './targets.mjs'

const args = Object.fromEntries(
    process.argv.slice(2).map((arg) => {
        const [key, value] = arg.replace(/^--/, '').split('=')

        return [key, value ?? true]
    }),
)
const RUNS = Number(args.runs ?? 5)
const wanted = String(args.targets ?? 'react,filament').split(',')
const PANELS = String(args.panels ?? 'bench,admin').split(',')
const CACHES = String(args.caches ?? 'optimize')
const MAX_LOAD = Number(args['max-load'] ?? 3)
const RESOURCE = '/bench-big-records'

if (!['optimize', 'none', 'keep'].includes(CACHES)) throw new Error(`--caches=${CACHES}?`)

/** Query strings per app; `expect` is a SKU the response must contain (checked every run). */
const SCENARIOS = [
    { id: 'first', label: 'First page', alfakit: '', filament: '', expect: 'BIG-0000001' },
    {
        id: 'page-2',
        label: 'Page 2',
        alfakit: 'page=2',
        filament: 'page=2',
        expect: 'BIG-0000026',
        cursor: true,
    },
    {
        id: 'deep',
        label: 'Deep page (10,000)',
        alfakit: 'page=10000',
        filament: 'page=10000',
        expect: 'BIG-0249976',
        offsetOnly: true,
    },
    {
        id: 'sort-indexed',
        label: 'Sort, indexed (created_at)',
        alfakit: 'sort=created_at&direction=asc',
        filament: 'sort=created_at:asc',
        expect: 'BIG-0963965',
    },
    {
        id: 'sort-unindexed',
        label: 'Sort, unindexed (unit_price)',
        alfakit: 'sort=unit_price&direction=asc',
        filament: 'sort=unit_price:asc',
        expect: 'BIG-0100000',
    },
    {
        id: 'filter',
        label: 'Select filter (status)',
        alfakit: 'filters[status][value]=active',
        filament: 'filters[status][value]=active',
        expect: 'BIG-0000003',
    },
    {
        id: 'search',
        label: 'Search, indexed prefix (sku)',
        alfakit: 'search=BIG-00424',
        filament: 'search=BIG-00424',
        expect: 'BIG-0042400',
    },
]

const MODES = {
    alfakit: [
        { id: 'default', label: 'numbered (default)' },
        // Numbered pagination whose count(*) loads after the rows (`deferTotals()`).
        { id: 'deferred', label: 'numbered + deferTotals()' },
        { id: 'simple', label: 'simple' },
        { id: 'cursor', label: 'cursor' },
    ],
    filament: [
        { id: 'default', label: 'numbered (default)' },
        { id: 'simple', label: 'simplePagination' },
        { id: 'cursor', label: 'cursor' },
    ],
}

const encode = (query) =>
    query
        .split('&')
        .filter(Boolean)
        .map((pair) => {
            const [key, value = ''] = pair.split('=')

            return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
        })
        .join('&')

const url = (panel, query, mode) => {
    const path = `/${panel}${RESOURCE}`
    const parts = [mode === 'default' ? '' : `mode=${mode}`, query].filter(Boolean)

    return parts.length ? `${path}?${parts.join('&')}` : path
}

/** The next-page cursor in a first-page response (AlfaKit props or Filament HTML). */
const nextCursor = (text) => {
    const decoded = text
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/\\\//g, '/')
    const match =
        decoded.match(/"nextCursor"\s*:\s*"([^"]+)"/) ??
        decoded.match(/[?&]cursor=([A-Za-z0-9_\-%.=]+)/)

    return match ? decodeURIComponent(match[1]) : null
}

const loadAverage = () => os.loadavg().map((value) => round(value, 2))

async function measure(client, path, expect) {
    const samples = []

    for (let run = 0; run <= RUNS; run++) {
        const response = await client.request(path)

        if (response.status !== 200)
            throw new Error(`${path}: HTTP ${response.status}\n${response.text.slice(0, 300)}`)
        if (!response.text.includes(expect)) throw new Error(`${path}: missing ${expect}`)
        if (run > 0) samples.push(response)
    }

    return {
        path,
        ttfb: summarize(samples.map((sample) => sample.ttfb)),
        total: summarize(samples.map((sample) => sample.total)),
        bytes: samples.at(-1).bytes,
        gzipBytes: samples.at(-1).gzipBytes,
    }
}

const meta = {
    date: new Date().toISOString(),
    runs: RUNS,
    rows: 1_000_000,
    perPage: 25,
    caches: CACHES,
    ssr: false,
    hardware: hardware(),
    loadBefore: loadAverage(),
    loadPerTarget: {},
}
const results = []
const root = new URL('../..', import.meta.url).pathname
const caches = cacheGuard(root, CACHES)
const envGuard = debugOffGuard(root, { keepDebug: Boolean(args['keep-debug']), ssr: false })

/** What one target serves the scenarios on: AlfaKit's panels, Filament's `admin` panel. */
const runsFor = (target) =>
    target.kind === 'filament'
        ? [{ panel: 'admin', name: target.name, label: target.label }]
        : PANELS.map((panel) => ({
              panel,
              name: panel === 'admin' ? target.name : `${target.name}-${panel}`,
              label: panel === 'admin' ? `${target.label}, full` : `${target.label}, lean`,
          }))

for (const target of TARGETS.filter((candidate) => wanted.includes(candidate.name))) {
    envGuard.disable(target)
    caches.prepare(target)
    meta.loadPerTarget[target.name] = round(await waitForIdle(MAX_LOAD), 2)
    let client

    try {
        client = await signIn(target)
    } catch (error) {
        console.error(`skip ${target.name}: ${error.message}`)
        continue
    }

    const info = await serverInfo(client)

    // Warm the target up before any measurement: every scenario once per panel, so OPcache
    // holds the freshly cached files and the database file (the unindexed sort reads the whole
    // table) is in the OS page cache, whichever panel or mode is measured first.
    for (const run of runsFor(target)) {
        for (const scenario of SCENARIOS) {
            await client.request(url(run.panel, encode(scenario[target.kind]), 'default'))
        }
    }

    for (const run of runsFor(target)) {
        for (const mode of MODES[target.kind]) {
            for (const scenario of SCENARIOS) {
                const row = {
                    target: run.name,
                    label: run.label,
                    panel: run.panel,
                    mode: mode.id,
                    modeLabel: mode.label,
                    scenario: scenario.id,
                    scenarioLabel: scenario.label,
                }
                let path = url(run.panel, encode(scenario[target.kind]), mode.id)

                if (mode.id === 'cursor' && scenario.offsetOnly) {
                    results.push({ ...row, skipped: 'cursor pagination has no page numbers' })
                    continue
                }

                if (mode.id === 'cursor' && scenario.cursor) {
                    const first = await client.request(url(run.panel, '', 'cursor'))
                    const cursor = nextCursor(first.text)

                    if (!cursor) {
                        results.push({
                            ...row,
                            skipped: 'next cursor not found in the first page response',
                        })
                        continue
                    }

                    path = url(run.panel, `cursor=${encodeURIComponent(cursor)}`, 'cursor')
                }

                try {
                    const measured = await measure(client, path, scenario.expect)
                    results.push({ ...row, ...measured })
                    console.log(
                        `${run.name.padEnd(14)} ${mode.id.padEnd(8)} ${scenario.id.padEnd(15)} ttfb ${measured.ttfb.median} ms  ${formatBytes(measured.bytes)} (${formatBytes(measured.gzipBytes)} gz)`,
                    )
                } catch (error) {
                    results.push({ ...row, error: error.message.split('\n')[0] })
                    console.log(
                        `${run.name.padEnd(14)} ${mode.id.padEnd(8)} ${scenario.id.padEnd(15)} ERROR ${error.message.split('\n')[0]}`,
                    )
                }
            }
        }
    }

    results.push({ target: target.name, info })
}

caches.restore()
envGuard.restore()
meta.loadAfter = loadAverage()

const day = meta.date.slice(0, 10)
const dir = new URL('../../benchmarks/results/suite/', import.meta.url)
mkdirSync(dir, { recursive: true })
writeFileSync(new URL(`1m-${day}.json`, dir), `${JSON.stringify({ meta, results }, null, 4)}\n`)

const h = meta.hardware
const lines = [
    `# 1,000,000-row table benchmark (${day})`,
    '',
    `Server TTFB (median of ${RUNS} after 1 warm-up, sequential, full HTML page load) and response size, 25 rows per page, SQLite. Results vary by hardware.`,
    '',
    `Laravel caches: ${CACHES === 'optimize' ? '`php artisan optimize` in every app (config, events, routes, views, `alfakit:optimize` / `filament:optimize`)' : CACHES === 'none' ? 'none (`optimize:clear` in every app)' : 'left as each app had them'}. APP_DEBUG off, Inertia SSR and devtools off, database sessions in every app. AlfaKit "lean" is the playground's /bench panel (benchmark resources only, no plugins, Filament's default middleware); "full" is /admin with every playground plugin.`,
    '',
    `Hardware: ${h.machine ?? ''} ${h.cpu} (${h.cores} cores), ${h.memoryGb} GB, ${h.os}, PHP ${h.php}, Node ${h.node}${h.herd ? `, Herd ${h.herd}` : ''}. Load average before ${meta.loadBefore.join(' / ')}, after ${meta.loadAfter.join(' / ')}; 1-minute load when each target started: ${Object.entries(
        meta.loadPerTarget,
    )
        .map(([name, load]) => `${name} ${load}`)
        .join(', ')}.`,
    '',
    '| App | Pagination | Scenario | TTFB median | p95 | HTML | gzip |',
    '| --- | --- | --- | ---: | ---: | ---: | ---: |',
]

for (const row of results.filter((entry) => entry.scenario)) {
    lines.push(
        row.ttfb
            ? `| ${row.label} | ${row.modeLabel} | ${row.scenarioLabel} | ${Math.round(row.ttfb.median)} ms | ${Math.round(row.ttfb.p95)} ms | ${formatBytes(row.bytes)} | ${formatBytes(row.gzipBytes)} |`
            : `| ${row.label} | ${row.modeLabel} | ${row.scenarioLabel} | n/a | | | ${row.skipped ?? row.error} |`,
    )
}

// Prettier-formatted (aligned table columns), so the table can be pasted into the docs as is.
const { format } = await import('prettier')
writeFileSync(
    new URL(`1m-${day}.md`, dir),
    await format(`${lines.join('\n')}\n`, { parser: 'markdown' }),
)
console.log(`\nwrote benchmarks/results/suite/1m-${day}.{json,md}`)
