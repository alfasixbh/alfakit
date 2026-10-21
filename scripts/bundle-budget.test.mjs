// pnpm test:scripts (node --test scripts/*.test.mjs)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { chromeModules, compare, initialChunks, measure, rebaseline } from './bundle-budget.mjs'

test('initial chunks follow static imports once, ignoring cycles', () => {
    const graph = { entry: ['a', 'b'], a: ['shared'], b: ['shared', 'entry'], shared: [] }

    assert.deepEqual(
        [...initialChunks('entry', (key) => graph[key])],
        ['entry', 'a', 'shared', 'b'],
    )
})

test('measure sums raw and gzip bytes per chunk', () => {
    const sizes = measure([
        { name: 'a.js', code: 'x'.repeat(1000) },
        { name: 'b.js', code: 'y' },
    ])

    assert.equal(sizes.rawBytes, 1001)
    assert.equal(sizes.chunks, 2)
    assert.ok(sizes.gzipBytes > 0 && sizes.gzipBytes < 1001)
})

test('entries over their limit fail; entries without a budget only report', () => {
    const budget = { entries: { 'host:react': { limitGzipBytes: 100 } } }
    const results = {
        'host:react': { rawBytes: 300, gzipBytes: 101, chunks: 1 },
        'host:vue': { rawBytes: 300, gzipBytes: 999, chunks: 1 },
    }

    assert.deepEqual(
        compare(results, budget).map(({ name, ok }) => [name, ok]),
        [
            ['host:react', false],
            ['host:vue', true],
        ],
    )
})

test('rebaselining adds the headroom to the measured size', () => {
    const next = rebaseline(
        { 'panel:svelte': { rawBytes: 5000, gzipBytes: 1000, chunks: 3 } },
        { headroomPercent: 10, entries: {} },
        new Date('2026-01-01T00:00:00Z'),
    )

    assert.equal(next.entries['panel:svelte'].limitGzipBytes, 1100)
    assert.equal(next.entries['panel:svelte'].baseline.measuredAt, '2026-01-01T00:00:00.000Z')
})

test('entries over their chunk limit or carrying panel chrome fail', () => {
    const budget = {
        entries: {
            'starter-kit:react': { limitGzipBytes: 1000, limitChunks: 10 },
            'starter-kit:vue': { limitGzipBytes: 1000, limitChunks: 10 },
        },
    }
    const results = {
        'starter-kit:react': { rawBytes: 1, gzipBytes: 1, chunks: 11, forbidden: [] },
        'starter-kit:vue': { rawBytes: 1, gzipBytes: 1, chunks: 3, forbidden: ['AppLayout.js'] },
    }

    assert.deepEqual(
        compare(results, budget).map(({ name, ok }) => [name, ok]),
        [
            ['starter-kit:react', false],
            ['starter-kit:vue', false],
        ],
    )
})

test('the panel chrome of every renderer is recognised, the starter kit layout is not', () => {
    assert.deepEqual(
        chromeModules([
            '/repo/packages/react/dist/layouts/app-layout.js',
            '/repo/packages/react/dist/components/panel/app-sidebar.js',
            '/repo/packages/react/dist/components/panel/topbar.js',
            '/repo/packages/vue/dist/layouts/AppLayout.js',
            '/repo/packages/vue/dist/layouts/TopNavLayout.vue_vue_type_script_setup_true_lang.js',
            '/repo/packages/svelte/dist/components/panel/AppSidebar.svelte',
            '/repo/packages/svelte/dist/components/panel/Topbar.svelte',
            '/repo/packages/react/dist/layouts/max-widths.js',
            '/repo/packages/react/dist/components/panel/topbar-actions.js',
            '/repo/packages/svelte/dist/components/panel/TopbarLocaleSwitcher.svelte',
            '/repo/packages/vue/dist/starter-kit/StarterKitContentLayout.js',
        ]),
        [
            '/repo/packages/react/dist/layouts/app-layout.js',
            '/repo/packages/react/dist/components/panel/app-sidebar.js',
            '/repo/packages/react/dist/components/panel/topbar.js',
            '/repo/packages/vue/dist/layouts/AppLayout.js',
            '/repo/packages/vue/dist/layouts/TopNavLayout.vue_vue_type_script_setup_true_lang.js',
            '/repo/packages/svelte/dist/components/panel/AppSidebar.svelte',
            '/repo/packages/svelte/dist/components/panel/Topbar.svelte',
        ],
    )
})

test('rebaselining sets a chunk limit and drops the module list', () => {
    const next = rebaseline(
        { 'starter-kit:react': { rawBytes: 5000, gzipBytes: 1000, chunks: 50, forbidden: [] } },
        { headroomPercent: 10, entries: {} },
    )

    assert.equal(next.entries['starter-kit:react'].limitChunks, 55)
    assert.equal(next.entries['starter-kit:react'].baseline.forbidden, undefined)
})
