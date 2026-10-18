/**
 * Browser measurements with Playwright (the Chrome installed on the machine, headless):
 * navigation timings, paint, time to interactive and interaction latency.
 *
 * Time to interactive (TTI) here: the scenario's ready condition holds (rows rendered, fields
 * mounted, widgets loaded) and the main thread has had no long task (> 50 ms) for 500 ms; the
 * value is the later of the moment the condition first held and the end of the last long
 * task. Total blocking time sums the part of each long task over 50 ms between first
 * contentful paint and TTI. Interaction latency is timed in Node around the user action
 * (Playwright input) until the expected DOM change is painted, so it includes a few
 * milliseconds of driver overhead, the same for every target.
 */
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'

const OBSERVER = () => {
    window.__bench = { longTasks: [], lcp: null }

    try {
        new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                window.__bench.longTasks.push({
                    start: entry.startTime,
                    end: entry.startTime + entry.duration,
                })
            }
        }).observe({ type: 'longtask', buffered: true })
        new PerformanceObserver((list) => {
            const entries = list.getEntries()
            window.__bench.lcp = entries.at(-1)?.startTime ?? window.__bench.lcp
        }).observe({ type: 'largest-contentful-paint', buffered: true })
    } catch {
        // Long tasks and LCP are Chromium APIs; the run reports null without them.
    }
}

export async function launchBrowser(root) {
    const require = createRequire(join(root, 'e2e/package.json'))
    const { chromium } = require('@playwright/test')
    const browser = await chromium.launch({
        channel: process.env.BENCH_BROWSER_CHANNEL ?? 'chrome',
    })

    return browser
}

/** A signed-in browser context for a target (cookies from `/benchmark/login`). */
export async function signedInContext(browser, target) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    await context.addInitScript(OBSERVER)

    const page = await context.newPage()
    const response = await page.goto(`${target.url}/benchmark/login`, { waitUntil: 'load' })

    if (!response || response.status() >= 400)
        throw new Error(`${target.name}: /benchmark/login failed`)

    await page.close()

    return context
}

/** Wait (in the page, frame by frame) until the ready condition holds; returns performance.now() then. */
async function waitUntilReady(page, condition, timeout = 30000) {
    return page.evaluate(
        async ({ condition, timeout }) => {
            const holds = (rule) =>
                rule === undefined || document.querySelectorAll(rule.selector).length >= rule.count
            const met = () =>
                holds(condition) &&
                holds(condition.also) &&
                (!condition.text || document.body.innerText.includes(condition.text))
            const deadline = performance.now() + timeout

            while (!met()) {
                if (performance.now() > deadline) return null
                await new Promise((resolve) => requestAnimationFrame(resolve))
            }

            return performance.now()
        },
        { condition, timeout },
    )
}

/** Wait for 500 ms without a long task (or give up after 10 s); returns the end of the last long task. */
async function waitForQuiet(page) {
    return page.evaluate(async () => {
        const started = performance.now()
        const lastEnd = () =>
            window.__bench.longTasks.reduce((end, task) => Math.max(end, task.end), 0)

        while (performance.now() - started < 10000) {
            if (performance.now() - lastEnd() >= 500) break
            await new Promise((resolve) => setTimeout(resolve, 50))
        }

        return lastEnd()
    })
}

/** Load a scenario page once and collect its timings. */
export async function measurePageLoad(context, target, scenario, selectors) {
    const page = await context.newPage()
    const condition = scenario.ready(selectors)

    try {
        const response = await page.goto(target.url + scenario.path, {
            waitUntil: 'domcontentloaded',
        })

        if (!response || response.status() >= 400) {
            throw new Error(`${target.name} ${scenario.id}: HTTP ${response?.status()}`)
        }

        const readyAt = await waitUntilReady(page, condition)

        if (readyAt === null)
            throw new Error(
                `${target.name} ${scenario.id}: page never became ready (${JSON.stringify(condition)})`,
            )

        const lastLongTask = await waitForQuiet(page)
        const metrics = await page.evaluate(
            ({ readyAt, lastLongTask }) => {
                const navigation = performance.getEntriesByType('navigation')[0]
                const fcp =
                    performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null
                const tti = Math.max(readyAt, lastLongTask)
                const blocking = window.__bench.longTasks
                    .filter((task) => fcp === null || task.end > fcp)
                    .filter((task) => task.start < tti)
                    .reduce((sum, task) => sum + Math.max(0, task.end - task.start - 50), 0)
                const resources = performance.getEntriesByType('resource')

                return {
                    ttfb: navigation.responseStart - navigation.startTime,
                    domContentLoaded: navigation.domContentLoadedEventEnd - navigation.startTime,
                    load:
                        navigation.loadEventEnd > 0
                            ? navigation.loadEventEnd - navigation.startTime
                            : null,
                    fcp,
                    lcp: window.__bench.lcp,
                    ready: readyAt,
                    tti,
                    totalBlockingTime: blocking,
                    longTasks: window.__bench.longTasks.length,
                    domNodes: document.getElementsByTagName('*').length,
                    jsHeap: performance.memory?.usedJSHeapSize ?? null,
                    documentBytes: navigation.decodedBodySize,
                    transferBytes:
                        navigation.transferSize +
                        resources.reduce((sum, entry) => sum + (entry.transferSize ?? 0), 0),
                    requests: resources.length + 1,
                }
            },
            { readyAt, lastLongTask },
        )

        return { page, metrics }
    } catch (error) {
        await page.close()
        throw error
    }
}

/** One user action on a ready page; returns its latency in ms. */
export async function measureInteraction(page, kind, selectors, searchTerm, searchResult) {
    if (kind === 'sort') {
        const firstRow = () => page.locator(selectors.tableRow).first().innerText()
        const before = await firstRow()
        const header = page
            .locator('thead th', { hasText: /^\s*Name\s*$/ })
            .locator('button')
            .first()
        const started = performance.now()
        await header.click()
        await page.waitForFunction(
            ({ selector, before }) => document.querySelector(selector)?.innerText !== before,
            { selector: selectors.tableRow, before },
            { polling: 'raf', timeout: 30000 },
        )

        return performance.now() - started
    }

    if (kind === 'live-field') {
        const value = `bench ${Math.random().toString(36).slice(2, 8)}`
        const started = performance.now()
        await page.locator('[id$="field_1"]').first().fill(value)
        await page.waitForFunction(
            (expected) => document.querySelector('[id$="field_2"]')?.value === expected,
            value.toUpperCase(),
            { polling: 'raf', timeout: 30000 },
        )

        return performance.now() - started
    }

    if (kind === 'global-search') {
        const input = await selectors.searchOpen(page)
        const started = performance.now()
        await page.locator(input).first().fill(searchTerm)
        await page.waitForFunction(
            ({ selector, result }) =>
                [...document.querySelectorAll(selector)].some((element) =>
                    element.innerText.includes(result),
                ),
            { selector: selectors.searchResult, result: searchResult },
            { polling: 'raf', timeout: 30000 },
        )

        return performance.now() - started
    }

    return null
}

export async function browserVersion(browser) {
    return browser.version()
}
