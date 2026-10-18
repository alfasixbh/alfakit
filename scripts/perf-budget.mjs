#!/usr/bin/env node
/**
 * Performance budget for the React playground's panel entry.
 *
 *   pnpm run perf:budget            build the playground, fail when the entry is over budget
 *   pnpm run perf:budget --update   re-baseline: store the measured size and a new limit
 *   pnpm run perf:budget --no-build measure the existing build output
 *
 * The budget is the gzip size of `resources/js/alfakit/app.tsx`'s initial JavaScript: the
 * entry chunk and every chunk it imports statically (lazy `import()` chunks don't count;
 * they load on demand). The numbers live in perf-budget.json next to this script.
 */
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const budgetPath = join(here, 'perf-budget.json')
const args = new Set(process.argv.slice(2))

const budget = JSON.parse(readFileSync(budgetPath, 'utf8'))
const playground = join(root, budget.playground)
const manifestPath = join(playground, 'public/build/manifest.json')

if (!args.has('--no-build')) {
    const result = spawnSync('pnpm', ['--filter', budget.package, 'build'], {
        cwd: root,
        stdio: 'inherit',
        shell: process.platform === 'win32',
    })

    if (result.status !== 0) {
        console.error(`perf:budget: building ${budget.package} failed.`)
        process.exit(result.status ?? 1)
    }
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const entry = manifest[budget.entry]

if (!entry) {
    console.error(`perf:budget: ${budget.entry} is not an entry in ${manifestPath}.`)
    process.exit(1)
}

/** The entry chunk plus the chunks it imports statically, each once. */
function initialChunks(key, seen = new Set()) {
    if (seen.has(key)) return seen

    seen.add(key)

    for (const imported of manifest[key]?.imports ?? []) initialChunks(imported, seen)

    return seen
}

const gzipBytes = (file) => gzipSync(readFileSync(join(playground, 'public/build', file))).length

const chunks = [...initialChunks(budget.entry)].map((key) => {
    const file = manifest[key].file

    return { key, file, gzipBytes: gzipBytes(file) }
})
const total = chunks.reduce((sum, chunk) => sum + chunk.gzipBytes, 0)
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} kB`

console.log(`perf:budget: ${budget.entry} initial JavaScript (gzip)`)

for (const chunk of chunks) {
    console.log(`  ${kb(chunk.gzipBytes).padStart(10)}  ${chunk.file}`)
}

console.log(`  ${kb(total).padStart(10)}  total (${chunks.length} chunks)`)

if (args.has('--update')) {
    const headroom = budget.headroomPercent ?? 10
    const limit = Math.ceil(total * (1 + headroom / 100))

    writeFileSync(
        budgetPath,
        `${JSON.stringify(
            {
                ...budget,
                limitGzipBytes: limit,
                baseline: {
                    gzipBytes: total,
                    chunks: chunks.length,
                    measuredAt: new Date().toISOString(),
                },
            },
            null,
            2,
        )}\n`,
    )
    console.log(`perf:budget: baseline set to ${kb(total)}, limit ${kb(limit)} (+${headroom}%).`)
    process.exit(0)
}

const baseline = budget.baseline?.gzipBytes
const delta = baseline
    ? ` (${total >= baseline ? '+' : ''}${kb(total - baseline)} vs baseline)`
    : ''

if (total > budget.limitGzipBytes) {
    console.error(
        `perf:budget: FAIL ${kb(total)} is over the ${kb(budget.limitGzipBytes)} limit${delta}.`,
    )
    console.error(
        'perf:budget: shrink the change, lazy-load it, or run `pnpm run perf:budget -- --update` and justify the new baseline in the PR.',
    )
    process.exit(1)
}

console.log(`perf:budget: OK ${kb(total)} within the ${kb(budget.limitGzipBytes)} limit${delta}.`)
