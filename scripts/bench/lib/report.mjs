/**
 * Markdown from a results file: the hardware and software block and one table per measurement
 * (server, browser, interactions), with a column per target. Only measured values are printed;
 * anything not measured is "n/a".
 */
import { formatBytes, formatMs } from './stats.mjs'

const median = (summary) => summary?.median ?? null

function table(headers, rows) {
    const lines = [`| ${headers.join(' | ')} |`, `| ${headers.map(() => '---').join(' | ')} |`]

    for (const row of rows) lines.push(`| ${row.join(' | ')} |`)

    return lines.join('\n')
}

function cell(result, pick) {
    if (!result) return 'n/a'
    if (result.error) return 'error'

    return pick(result) ?? (result.browserError ? 'failed' : 'n/a')
}

export function hardwareMarkdown(meta) {
    const hw = meta.hardware
    const cores = hw.coreTypes
        ? `${hw.cores} (${hw.coreTypes.performance} performance + ${hw.coreTypes.efficiency} efficiency)`
        : String(hw.cores)
    const rows = [
        ['CPU', `${hw.cpu}${hw.machine ? ` (${hw.machine})` : ''}`],
        ['Cores', cores],
        ['Memory', `${hw.memoryGb} GB`],
        ['Operating system', `${hw.os} (${hw.arch})`],
        ['PHP (CLI)', hw.php ?? 'n/a'],
        ['Node', hw.node],
        ['Browser', meta.browser ?? 'not run'],
    ]

    for (const target of meta.targets) {
        const info = target.server

        if (!info) continue

        const packages = Object.entries(info.packages ?? {})
            .map(([name, version]) => `${name} ${version}`)
            .join(', ')
        rows.push([
            `${target.label} server`,
            `PHP ${info.php} (${info.sapi}, OPcache ${info.opcache ? 'on' : 'off'}), Laravel ${info.laravel}, APP_DEBUG ${info.debug ? 'true' : 'false'}, config and route cache ${info.configCached ? 'on' : 'off'}${info.routesCached === info.configCached ? '' : ` / ${info.routesCached ? 'on' : 'off'}`}, ${info.database}${info.ssr === undefined ? '' : `, Inertia SSR ${info.ssr ? 'on' : 'off'}`}${packages ? `; ${packages}` : ''}`,
        ])
    }

    rows.push([
        'Method',
        `${meta.warmup} warm-up + ${meta.runs} measured runs per scenario, medians; ${meta.date.slice(0, 10)}`,
    ])

    if (meta.loadAverage?.start) {
        rows.push([
            'Load average (1/5/15 min)',
            `${meta.loadAverage.start.join(' / ')} at the start, ${meta.loadAverage.end?.join(' / ') ?? 'n/a'} at the end`,
        ])
    }

    return table(['', ''], rows)
}

export function resultsMarkdown(results) {
    const { meta } = results
    const targets = meta.targets.filter((target) => !target.skipped)
    const scenarios = meta.scenarios
    const find = (target, scenario) =>
        results.results.find((r) => r.target === target.name && r.scenario === scenario.id)
    const headers = ['Scenario', ...targets.map((target) => target.label)]
    const sections = []

    sections.push(
        '#### Server: full page (median time to first byte, HTML size uncompressed / gzip)\n',
    )
    sections.push(
        table(
            headers,
            scenarios.map((scenario) => [
                scenario.label,
                ...targets.map((target) =>
                    cell(find(target, scenario), (r) =>
                        r.server?.page
                            ? `${formatMs(median(r.server.page.ttfb))}, ${formatBytes(median(r.server.page.bytes))} / ${formatBytes(median(r.server.page.gzipBytes))}`
                            : null,
                    ),
                ),
            ]),
        ),
    )

    sections.push(
        '\n#### Server: the request behind the interaction (median response time, response size)\n',
    )
    sections.push(
        table(
            headers,
            scenarios
                .filter((scenario) => scenario.interaction || scenario.id === 'dashboard')
                .map((scenario) => [
                    scenario.id === 'dashboard'
                        ? `${scenario.label}: widget data`
                        : `${scenario.label}: ${scenario.interactionLabel}`,
                    ...targets.map((target) =>
                        cell(find(target, scenario), (r) => {
                            const request =
                                scenario.id === 'dashboard'
                                    ? r.server?.deferred
                                    : r.server?.interaction

                            return request
                                ? `${formatMs(median(request.total))}, ${formatBytes(median(request.bytes))}`
                                : null
                        }),
                    ),
                ]),
        ),
    )

    if (meta.browser) {
        sections.push(
            '\n#### Browser: page load (median time to interactive; total blocking time; DOM nodes)\n',
        )
        sections.push(
            table(
                headers,
                scenarios.map((scenario) => [
                    scenario.label,
                    ...targets.map((target) =>
                        cell(find(target, scenario), (r) =>
                            r.browser
                                ? `${formatMs(median(r.browser.tti))}; TBT ${formatMs(median(r.browser.totalBlockingTime))}; ${Math.round(median(r.browser.domNodes) ?? 0).toLocaleString('en')} nodes`
                                : null,
                        ),
                    ),
                ]),
            ),
        )

        sections.push(
            '\n#### Browser: interaction latency (median, from the input until the result is painted)\n',
        )
        sections.push(
            table(
                headers,
                scenarios
                    .filter((scenario) => scenario.interaction)
                    .map((scenario) => [
                        `${scenario.label}: ${scenario.interactionLabel}`,
                        ...targets.map((target) =>
                            cell(find(target, scenario), (r) =>
                                r.browser?.interaction
                                    ? formatMs(median(r.browser.interaction))
                                    : null,
                            ),
                        ),
                    ]),
            ),
        )
    }

    return sections.join('\n')
}

export function fullMarkdown(results) {
    return [
        `### Benchmark results (${results.meta.date.slice(0, 10)}, label \`${results.meta.label}\`)`,
        '',
        hardwareMarkdown(results.meta),
        '',
        resultsMarkdown(results),
        '',
        `Notes: ${results.meta.notes.join(' ')}`,
        '',
    ].join('\n')
}
