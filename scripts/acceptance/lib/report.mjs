// Records PASS / FAIL / SKIP per step and writes the Markdown report.
import { mkdirSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { log } from './util.mjs'

export class SkipError extends Error {}

/** Throw inside a step to mark it SKIP with a reason. */
export function skip(reason) {
    throw new SkipError(reason)
}

export class Report {
    constructor({ dir, name, renderer, mode, meta }) {
        this.dir = dir // reports/<stamp>-<renderer>-<mode>/ (screenshots, excerpts)
        this.mdPath = `${dir}.md`
        this.name = name
        this.renderer = renderer
        this.mode = mode
        this.meta = meta
        this.steps = []
        this.blockers = new Map() // group -> reason, for dependent steps
        mkdirSync(dir, { recursive: true })
    }

    /** Path for an artifact (screenshot, log excerpt) inside the report folder. */
    artifact(file) {
        return join(this.dir, file)
    }

    /**
     * Runs one check. `fn` returns an optional detail string (or { detail, screenshots }).
     * Options: `needs` (groups whose failure skips this step), `blocks` (a failure blocks that
     * group), `before()` / `after(step)` (hooks for browser error collection and screenshots).
     */
    async step(id, title, fn, { needs = [], blocks = null, before = null, after = null } = {}) {
        const step = { id, title, status: 'PASS', detail: '', screenshots: [], started: Date.now() }
        this.steps.push(step)

        const blocked = needs.map((group) => this.blockers.get(group)).find(Boolean)
        if (blocked) {
            step.status = 'SKIP'
            step.detail = `blocked: ${blocked}`
            log(`SKIP ${id} ${title} (${step.detail})`)
            return step
        }

        log(`---- ${id} ${title}`)
        before?.()
        try {
            const result = await fn(step)
            if (typeof result === 'string') step.detail = result
            else if (result?.detail) step.detail = result.detail
        } catch (error) {
            if (error instanceof SkipError) {
                step.status = 'SKIP'
                step.detail = error.message
            } else {
                step.status = 'FAIL'
                step.detail = String(error?.stack ?? error)
                    .split('\n')
                    .filter((line) => !/^\s+at .*node_modules/.test(line))
                    .slice(0, 25)
                    .join('\n')
            }
        }

        if (after) {
            try {
                await after(step)
            } catch (error) {
                step.detail += `\n(after-step hook failed: ${error.message})`
            }
        }

        step.ms = Date.now() - step.started
        if (step.status === 'FAIL' && blocks) this.blockers.set(blocks, `${id} failed`)
        log(
            `${step.status} ${id} ${title}${step.status !== 'PASS' ? `\n${indent(step.detail)}` : ''}`,
        )
        return step
    }

    get counts() {
        const counts = { PASS: 0, FAIL: 0, SKIP: 0 }
        for (const step of this.steps) counts[step.status]++
        return counts
    }

    get failed() {
        return this.counts.FAIL > 0
    }

    write() {
        const { PASS, FAIL, SKIP } = this.counts
        const folder = basename(this.dir)
        const lines = [
            `# AlfaKit acceptance: ${this.renderer} × ${this.mode}`,
            '',
            `**Result: ${FAIL > 0 ? 'FAIL' : 'PASS'}** (${PASS} passed, ${FAIL} failed, ${SKIP} skipped)`,
            '',
            ...Object.entries(this.meta).map(([key, value]) => `- ${key}: ${value}`),
            '',
            '| # | Step | Result | Time |',
            '| - | ---- | ------ | ---- |',
            ...this.steps.map(
                (step) =>
                    `| ${step.id} | ${escapeCell(step.title)} | ${badge(step.status)} | ${((step.ms ?? 0) / 1000).toFixed(1)}s |`,
            ),
            '',
            '## Details',
            '',
        ]

        for (const step of this.steps) {
            lines.push(`### ${step.id} ${step.title} — ${step.status}`, '')
            if (step.detail) lines.push('```text', step.detail.trimEnd(), '```', '')
            for (const shot of step.screenshots) lines.push(`![${step.id}](${folder}/${shot})`, '')
        }

        writeFileSync(this.mdPath, `${lines.join('\n')}\n`)
        return this.mdPath
    }
}

const badge = (status) =>
    status === 'PASS' ? '✅ PASS' : status === 'FAIL' ? '❌ FAIL' : '⏭️ SKIP'
const escapeCell = (text) => String(text).replaceAll('|', '\\|')
const indent = (text) =>
    String(text)
        .split('\n')
        .map((line) => `    ${line}`)
        .join('\n')
