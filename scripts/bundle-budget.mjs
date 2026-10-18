#!/usr/bin/env node
/**
 * Bundle size budgets for what applications pay for AlfaKit (gzip of the initial JavaScript).
 *
 *   pnpm bundle:budget                measure, fail when an entry is over its budget
 *   pnpm bundle:budget --build        build the playgrounds first (the panel entries need them)
 *   pnpm bundle:budget --update       re-baseline: store the measured sizes and new limits
 *   pnpm bundle:budget --only=host    measure only the host entries (no playground needed)
 *
 * Two kinds of entries, per renderer (react, vue, svelte):
 *
 * - `host:<renderer>`: a starter kit host's AlfaKit share. A throwaway Vite build of an entry
 *   that imports what a host's sidebar and header import from the package root
 *   (`useAlfakitNavigation`, `Icon`, `AlfakitSearch`, `AlfakitNotifications`,
 *   `AlfakitTenantSwitcher`), with the framework and Inertia external: everything left is
 *   AlfaKit's (and its dependencies'). Needs the packages built (`pnpm build`), nothing else.
 * - `panel:<renderer>`: the playground's panel entry (`resources/js/alfakit/app.*`) from its
 *   Vite manifest, framework included, as in `perf-budget.mjs`.
 *
 * "Initial" is the entry chunk plus every chunk it imports statically; lazy `import()` chunks
 * load on demand and don't count. Budgets live in bundle-budget.json next to this script.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { gzipSync } from 'node:zlib'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const budgetPath = join(here, 'bundle-budget.json')

export const RENDERERS = ['react', 'vue', 'svelte']

const PANEL_ENTRIES = {
    react: 'resources/js/alfakit/app.tsx',
    vue: 'resources/js/alfakit/app.ts',
    svelte: 'resources/js/alfakit/app.ts',
}

/** What a starter kit host imports from the package root (sidebar navigation, header). */
export const HOST_IMPORTS = [
    'Icon',
    'useAlfakitNavigation',
    'AlfakitSearch',
    'AlfakitNotifications',
    'AlfakitTenantSwitcher',
]

/** The host's own dependencies, not AlfaKit's share. */
const HOST_EXTERNAL = /^(react|react-dom|vue|svelte|@inertiajs\/[^/]+)(\/.*)?$/

export const kb = (bytes) => `${(bytes / 1024).toFixed(1)} kB`

/**
 * The chunks a chunk loads before it runs: itself and its static imports, each once.
 * `importsOf(key)` lists a chunk's static imports.
 */
export function initialChunks(entry, importsOf, seen = new Set()) {
    if (seen.has(entry)) return seen

    seen.add(entry)

    for (const imported of importsOf(entry) ?? []) initialChunks(imported, importsOf, seen)

    return seen
}

/** Sizes of `files` (`{ name, code }`), summed: raw and gzip bytes. */
export function measure(files) {
    return files.reduce(
        (total, file) => {
            const bytes = Buffer.from(file.code)

            return {
                rawBytes: total.rawBytes + bytes.length,
                gzipBytes: total.gzipBytes + gzipSync(bytes).length,
                chunks: total.chunks + 1,
            }
        },
        { rawBytes: 0, gzipBytes: 0, chunks: 0 },
    )
}

/** `{ name, measured, limit, ok }` per entry; entries without a budget only report. */
export function compare(results, budget) {
    return Object.entries(results).map(([name, measured]) => {
        const limit = budget.entries?.[name]?.limitGzipBytes

        return { name, measured, limit, ok: limit === undefined || measured.gzipBytes <= limit }
    })
}

/** New budgets: each entry's measured size plus the headroom. */
export function rebaseline(results, budget, now = new Date()) {
    const headroom = budget.headroomPercent ?? 10
    const entries = { ...budget.entries }

    for (const [name, measured] of Object.entries(results)) {
        entries[name] = {
            limitGzipBytes: Math.ceil(measured.gzipBytes * (1 + headroom / 100)),
            baseline: { ...measured, measuredAt: now.toISOString() },
        }
    }

    return { ...budget, headroomPercent: headroom, entries }
}

async function measureHost(renderer) {
    const playground = join(root, 'playground', renderer)
    const packageRequire = createRequire(join(root, 'packages', renderer, 'package.json'))
    const { build } = await import(pathToFileURL(packageRequire.resolve('vite')).href)
    const plugins = []

    // The Svelte package ships `.svelte` sources; React and Vue ship compiled JavaScript.
    if (renderer === 'svelte') {
        const { svelte } = await import(
            pathToFileURL(packageRequire.resolve('@sveltejs/vite-plugin-svelte')).href
        )

        plugins.push(svelte({ configFile: false, compilerOptions: { runes: true } }))
    }

    const entryId = '\0alfakit-host-entry'

    plugins.push({
        name: 'alfakit-host-entry',
        resolveId: (id) => (id === 'alfakit-host-entry' ? entryId : null),
        load: (id) =>
            id === entryId
                ? `export { ${HOST_IMPORTS.join(', ')} } from '@alfakit/${renderer}'\n`
                : null,
    })

    const output = await build({
        root: playground,
        configFile: false,
        logLevel: 'silent',
        plugins,
        build: {
            write: false,
            minify: true,
            modulePreload: false,
            reportCompressedSize: false,
            rolldownOptions: {
                input: 'alfakit-host-entry',
                external: (id) => HOST_EXTERNAL.test(id),
                preserveEntrySignatures: 'strict',
            },
        },
    })
    const chunks = (Array.isArray(output) ? output : [output])
        .flatMap((result) => result.output)
        .filter((file) => file.type === 'chunk')
    const byName = new Map(chunks.map((chunk) => [chunk.fileName, chunk]))
    const entry = chunks.find((chunk) => chunk.isEntry)

    if (!entry) throw new Error(`bundle:budget: no entry chunk for host:${renderer}.`)

    // `imports` also lists the external modules (the framework); only chunks count.
    const initial = initialChunks(entry.fileName, (name) =>
        byName.get(name)?.imports.filter((imported) => byName.has(imported)),
    )

    return measure([...initial].map((name) => ({ name, code: byName.get(name).code })))
}

function measurePanel(renderer, { build }) {
    const playground = join(root, 'playground', renderer)
    const manifestPath = join(playground, 'public/build/manifest.json')

    if (build) {
        const result = spawnSync('pnpm', ['--filter', `@alfakit/playground-${renderer}`, 'build'], {
            cwd: root,
            stdio: 'inherit',
            shell: process.platform === 'win32',
        })

        if (result.status !== 0)
            throw new Error(`bundle:budget: building playground/${renderer} failed.`)
    }

    if (!existsSync(manifestPath)) {
        throw new Error(
            `bundle:budget: ${manifestPath} is missing; build the playground (or pass --build).`,
        )
    }

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    const entry = PANEL_ENTRIES[renderer]

    if (!manifest[entry]) throw new Error(`bundle:budget: ${entry} is not in ${manifestPath}.`)

    const initial = initialChunks(entry, (key) => manifest[key]?.imports)

    return measure(
        [...initial].map((key) => ({
            name: manifest[key].file,
            code: readFileSync(join(playground, 'public/build', manifest[key].file)),
        })),
    )
}

async function main(argv) {
    const args = new Set(argv.filter((arg) => !arg.startsWith('--only=')))
    const only = argv.find((arg) => arg.startsWith('--only='))?.slice('--only='.length)
    const budget = existsSync(budgetPath)
        ? JSON.parse(readFileSync(budgetPath, 'utf8'))
        : { headroomPercent: 10, entries: {} }
    const results = {}

    for (const renderer of RENDERERS) {
        if (only !== 'panel') results[`host:${renderer}`] = await measureHost(renderer)
    }

    for (const renderer of RENDERERS) {
        if (only !== 'host') {
            results[`panel:${renderer}`] = measurePanel(renderer, { build: args.has('--build') })
        }
    }

    if (args.has('--update')) {
        writeFileSync(budgetPath, `${JSON.stringify(rebaseline(results, budget), null, 2)}\n`)
        console.log(`bundle:budget: baselines updated in ${budgetPath}.`)

        return 0
    }

    let failed = false

    console.log('bundle:budget: initial JavaScript (gzip / raw)')

    for (const { name, measured, limit, ok } of compare(results, budget)) {
        const sizes = `${kb(measured.gzipBytes).padStart(10)} / ${kb(measured.rawBytes).padStart(10)}`
        const verdict =
            limit === undefined ? 'no budget' : `${ok ? 'OK  ' : 'FAIL'} limit ${kb(limit)}`

        console.log(`  ${name.padEnd(14)} ${sizes}  ${measured.chunks} chunks  ${verdict}`)
        failed ||= !ok
    }

    if (failed) {
        console.error(
            'bundle:budget: over budget. Lazy-load the new code (registry loaders, `import()`), or run `pnpm bundle:budget --update` and justify the new baseline in the PR.',
        )

        return 1
    }

    return 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
    main(process.argv.slice(2)).then(
        (code) => process.exit(code),
        (error) => {
            console.error(error instanceof Error ? error.message : error)
            process.exit(1)
        },
    )
}
