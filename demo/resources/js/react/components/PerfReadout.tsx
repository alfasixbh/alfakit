import {
    PERF_DEFAULTS,
    formatBytes,
    formatMs,
    measureInternalRequests,
    measurePage,
    observeRequests,
    type InternalRequest,
    type PerfReadoutComponent,
    type Transfer,
} from '@/shared/showcase'
import { Icon, useFormatter, useHydrated, useT } from '@alfakit/react'
import { useCallback, useEffect, useState } from 'react'

/**
 * Performance showcase: what the browser actually transferred for this page and for the
 * internal requests (`/_alfakit/*`), read from the Resource Timing API and the
 * `Server-Timing` header. Browser-only; the server renders the frame.
 */
export default function PerfReadout({ component }: { component: PerfReadoutComponent }) {
    const settings = component.props ?? PERF_DEFAULTS
    const t = useT()
    const format = useFormatter()
    const hydrated = useHydrated()
    const [page, setPage] = useState<Transfer | null>(null)
    const [requests, setRequests] = useState<InternalRequest[]>([])

    const refresh = useCallback(() => {
        setPage(measurePage())
        setRequests(measureInternalRequests())
    }, [])

    useEffect(() => {
        if (!hydrated) return

        refresh()

        return observeRequests(refresh)
    }, [hydrated, refresh])

    const unknown = t('showcase.performance.readout.unknown')
    const number = (value: number, options?: Intl.NumberFormatOptions) =>
        format.number(value, options)

    return (
        <section
            data-surface
            data-slot="perf-readout"
            className="bg-card text-card-foreground flex h-full flex-col gap-4 rounded-xl border p-5 shadow-sm"
            aria-live="polite"
        >
            <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 className="text-base leading-none font-semibold">
                        {t('showcase.performance.readout.heading')}
                    </h3>
                    <p className="text-muted-foreground mt-1.5 text-sm">
                        {t('showcase.performance.readout.body')}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={refresh}
                    className="hover:bg-accent inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors"
                >
                    <Icon name="refresh-cw" className="size-3.5" />
                    {t('showcase.performance.readout.refresh')}
                </button>
            </header>

            <dl className="grid gap-3 sm:grid-cols-3">
                <div className="bg-muted/40 rounded-lg border p-3">
                    <dt className="text-muted-foreground text-xs">
                        {t('showcase.performance.readout.page')}
                    </dt>
                    <dd className="mt-1 text-xl font-semibold tabular-nums">
                        {formatBytes(page?.size ?? null, number, unknown)}
                    </dd>
                    <dd className="text-muted-foreground text-xs">
                        {t('showcase.performance.readout.rows', { rows: number(settings.rows) })} ·{' '}
                        {t('showcase.performance.readout.items', { items: number(settings.items) })}
                    </dd>
                </div>
                <div className="bg-muted/40 rounded-lg border p-3">
                    <dt className="text-muted-foreground text-xs">
                        {t('showcase.performance.readout.time')}
                    </dt>
                    <dd className="mt-1 text-xl font-semibold tabular-nums">
                        {formatMs(page?.duration ?? null, number, unknown)}
                    </dd>
                    <dd className="text-muted-foreground text-xs">
                        {t('showcase.performance.readout.server')}:{' '}
                        {formatMs(page?.server ?? null, number, unknown)}
                    </dd>
                </div>
                <div className="bg-muted/40 rounded-lg border p-3">
                    <dt className="text-muted-foreground text-xs">
                        {t('showcase.performance.readout.requests')}
                    </dt>
                    <dd className="mt-1 text-xl font-semibold tabular-nums">
                        {number(requests.length)}
                    </dd>
                    <dd className="text-muted-foreground text-xs">
                        <a
                            href={settings.docsUrl}
                            target="_blank"
                            rel="noopener"
                            className="text-primary underline-offset-4 hover:underline"
                        >
                            {t('showcase.performance.readout.docs')}
                        </a>
                    </dd>
                </div>
            </dl>

            {requests.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                    {t('showcase.performance.readout.none')}
                </p>
            ) : (
                <table className="w-full text-sm">
                    <thead className="text-muted-foreground text-xs">
                        <tr>
                            <th scope="col" className="py-1 text-start font-medium">
                                {t('showcase.performance.readout.requests')}
                            </th>
                            <th scope="col" className="py-1 text-end font-medium">
                                {t('showcase.performance.readout.size')}
                            </th>
                            <th scope="col" className="py-1 text-end font-medium">
                                {t('showcase.performance.readout.time')}
                            </th>
                            <th scope="col" className="py-1 text-end font-medium">
                                {t('showcase.performance.readout.server')}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.map((request) => (
                            <tr key={request.id} className="border-t">
                                <td className="py-1.5 font-mono text-xs">{request.kind}</td>
                                <td className="py-1.5 text-end tabular-nums">
                                    {formatBytes(request.size, number, unknown)}
                                </td>
                                <td className="py-1.5 text-end tabular-nums">
                                    {formatMs(request.duration, number, unknown)}
                                </td>
                                <td className="py-1.5 text-end tabular-nums">
                                    {formatMs(request.server, number, unknown)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </section>
    )
}
