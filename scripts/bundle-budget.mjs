#!/usr/bin/env node
/**
 * Bundle size budgets for what applications pay for AlfaKit (gzip of the initial JavaScript).
 *
 *   pnpm bundle:budget                measure, fail when an entry is over its budget
 *   pnpm bundle:budget --build        build the playgrounds first (the panel entries need them)
 *   pnpm bundle:budget --update       re-baseline: store the measured sizes and new limits
 *   pnpm bundle:budget --only=host    measure only the host entries (no playground needed)
 *   pnpm bundle:budget --only=starter-kit   only the starter kit page entries (no playground)
 *
 * Two kinds of entries, per renderer (react, vue, svelte):
 *
 * - `host:<renderer>`: a starter kit host's AlfaKit share. A throwaway Vite build of an entry
 *   that imports what a host's sidebar and header import from the package root
 *   (`useAlfakitNavigation`, `Icon`, `AlfakitSearch`, `AlfakitNotifications`,
 *   `AlfakitTenantSwitcher`, `AlfakitCopilot`), with the framework and Inertia external:
 *   everything left is AlfaKit's (and its dependencies'). Needs the packages built (`pnpm build`), nothing else.
 * - `starter-kit:<renderer>`: the AlfaKit share of a starter kit's `Alfakit/Page` page (what
 *   `resources/js/pages/Alfakit/Page.*` imports: `createStarterKitPage`, or Svelte's
 *   `createStarterKitLayout` + `AlfakitPage`), built the same way. Besides its size it may not
 *   contain the panel's own chrome (sidebar, top bar, panel layouts): starter kit pages render
 *   in the host's layout, and every chunk of the page is a `Link: rel=modulepreload` entry of
 *   the response (Laravel's `AddLinkHeadersForPreloadedAssets`).
 * - `panel:<renderer>`: the playground's panel entry (`resources/js/alfakit/app.*`) from its
 *   Vite manifest, framework included, as in `perf-budget.mjs`.
 *
 * Entries may also have a `limitChunks` (the number of initial chunks, i.e. requests and
 * preload entries): `--update` sets it from the measured count plus the headroom.
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
    'AlfakitCopilot',
]

/** What a starter kit's `resources/js/pages/Alfakit/Page.*` imports (the `alfakit:install` stubs). */
export const STARTER_KIT_IMPORTS = {
    react: ['createStarterKitPage'],
    vue: ['createStarterKitPage'],
    svelte: ['createStarterKitLayout', 'AlfakitPage'],
}

/**
 * The panel's own chrome: a starter kit page renders in the host's layout, so none of these
 * may be in its initial chunks (they load on demand if a page asks for a panel layout).
 */
export const PANEL_CHROME =
    /[\\/](layouts[\\/](app-layout|top-nav-layout|AppLayout|TopNavLayout)|components[\\/]panel[\\/](app-sidebar|topbar|AppSidebar|Topbar))(\.vue_vue_type_[a-z_]+)?\.[a-z]+(\?.*)?$/

/** The module ids of `modules` that are panel chrome. */
export function chromeModules(modules) {
    return modules.filter((id) => PANEL_CHROME.test(id))
}

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

/**
 * `{ name, measured, limit, limitChunks, ok }` per entry; entries without a budget only report.
 * An entry fails over its gzip or chunk limit, or when it carries `forbidden` modules.
 */
export function compare(results, budget) {
    return Object.entries(results).map(([name, measured]) => {
        const limit = budget.entries?.[name]?.limitGzipBytes
        const limitChunks = budget.entries?.[name]?.limitChunks
        const ok =
            (limit === undefined || measured.gzipBytes <= limit) &&
            (limitChunks === undefined || measured.chunks <= limitChunks) &&
            (measured.forbidden ?? []).length === 0

        return { name, measured, limit, limitChunks, ok }
    })
}

/** New budgets: each entry's measured size plus the headroom. */
export function rebaseline(results, budget, now = new Date()) {
    const headroom = budget.headroomPercent ?? 10
    const entries = { ...budget.entries }

    for (const [name, measured] of Object.entries(results)) {
        const { forbidden: _forbidden, ...sizes } = measured

        entries[name] = {
            limitGzipBytes: Math.ceil(measured.gzipBytes * (1 + headroom / 100)),
            limitChunks: Math.ceil((measured.chunks * (100 + headroom)) / 100),
            baseline: { ...sizes, measuredAt: now.toISOString() },
        }
    }

    return { ...budget, headroomPercent: headroom, entries }
}

/** A throwaway Vite build of `exports` from the renderer's package root, framework external. */
async function measureHost(renderer, exports = HOST_IMPORTS) {
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
                ? `export { ${exports.join(', ')} } from '@alfakit/${renderer}'\n`
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

    return {
        ...measure([...initial].map((name) => ({ name, code: byName.get(name).code }))),
        modules: [...initial].flatMap((name) => byName.get(name).moduleIds),
    }
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
        if (only === undefined || only === 'host') {
            const { modules: _modules, ...sizes } = await measureHost(renderer)

            results[`host:${renderer}`] = sizes
        }
    }

    for (const renderer of RENDERERS) {
        if (only === undefined || only === 'starter-kit') {
            const { modules, ...sizes } = await measureHost(renderer, STARTER_KIT_IMPORTS[renderer])

            results[`starter-kit:${renderer}`] = { ...sizes, forbidden: chromeModules(modules) }
        }
    }

    for (const renderer of RENDERERS) {
        if (only === undefined || only === 'panel') {
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

    for (const { name, measured, limit, limitChunks, ok } of compare(results, budget)) {
        const sizes = `${kb(measured.gzipBytes).padStart(10)} / ${kb(measured.rawBytes).padStart(10)}`
        const chunks = `${String(measured.chunks).padStart(3)} chunks${limitChunks === undefined ? '' : ` (max ${limitChunks})`}`
        const verdict =
            limit === undefined ? 'no budget' : `${ok ? 'OK  ' : 'FAIL'} limit ${kb(limit)}`

        console.log(`  ${name.padEnd(19)} ${sizes}  ${chunks}  ${verdict}`)

        for (const id of measured.forbidden ?? []) {
            console.log(`    panel chrome in a starter kit page: ${id}`)
        }

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
