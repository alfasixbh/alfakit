// pnpm test:scripts (node --test scripts/*.test.mjs)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { compare, initialChunks, measure, rebaseline } from './bundle-budget.mjs'

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
