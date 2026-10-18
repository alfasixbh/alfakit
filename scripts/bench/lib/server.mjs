/**
 * Server-side measurements over HTTP (one sequential client per target): the full HTML page of
 * every scenario, and the request behind each interaction (the Inertia partial reload or
 * internal endpoint for AlfaKit, the Livewire update for Filament).
 */
import { Client, inertiaPage, livewireSnapshots } from './http.mjs'

const findKey = (value, key) => {
    if (value === null || typeof value !== 'object') return undefined
    if (key in value) return value[key]

    for (const child of Object.values(value)) {
        const found = findKey(child, key)

        if (found !== undefined) return found
    }

    return undefined
}

export async function signIn(target) {
    const client = new Client(target.url)
    const login = await client.request('/benchmark/login')

    if (login.status !== 302)
        throw new Error(`${target.name}: /benchmark/login answered HTTP ${login.status}`)

    return client
}

export async function serverInfo(client) {
    const response = await client.request('/benchmark/info')

    return response.status === 200 ? JSON.parse(response.text) : null
}

const check = (response, label, needle) => {
    if (response.status !== 200)
        throw new Error(`${label}: HTTP ${response.status}\n${response.text.slice(0, 400)}`)
    if (needle && !response.text.includes(needle))
        throw new Error(`${label}: response does not contain "${needle}"`)

    return response
}

/**
 * The requests measured per scenario: `page` (full HTML) and, where the scenario has one, the
 * `interaction` request. Each entry is `() => Promise<response>`, validated on every call.
 */
export async function requestsFor(client, target, scenario, searchTerm, searchResult) {
    const label = `${target.name} ${scenario.id}`
    const page = () =>
        client
            .request(scenario.path)
            .then((response) => check(response, `${label} page`, scenario.expect))
    const first = await page()
    const requests = { page }

    if (target.kind === 'alfakit') {
        const inertia = inertiaPage(first.text)
        const partial = (component, data) => ({
            Accept: 'text/html, application/xhtml+xml',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Inertia': 'true',
            'X-Inertia-Version': inertia.version ?? '',
            'X-Inertia-Partial-Component': component,
            'X-Inertia-Partial-Data': data,
        })

        if (scenario.interaction === 'sort') {
            const separator = scenario.path.includes('?') ? '&' : '?'
            requests.interaction = () =>
                client
                    .request(`${scenario.path}${separator}sort=name&direction=asc`, {
                        headers: partial(inertia.component, 'page'),
                    })
                    .then((response) => check(response, `${label} sort`, '"direction":"asc"'))
        }

        if (scenario.id === 'dashboard') {
            // The lazy widgets' data, loaded right after the page (deferred props).
            const deferred = Object.values(inertia.deferredProps ?? {}).flat()

            if (deferred.length > 0) {
                requests.deferred = () =>
                    client
                        .request(scenario.path, {
                            headers: partial(inertia.component, deferred.join(',')),
                        })
                        .then((response) =>
                            check(response, `${label} deferred widgets`, 'Average rating'),
                        )
            }
        }

        if (scenario.interaction === 'live-field') {
            const form = inertia.props.page.content.find((block) => block.type === 'Form')
            const refresh = findKey(inertia.props, 'schemaRefresh')
            const body = JSON.stringify({
                token: inertia.props.page.token,
                component: 'form',
                state: { ...form.state, field_1: 'bench value' },
                path: 'field_1',
                old: form.state.field_1,
                fingerprints: form.fingerprints ?? undefined,
            })

            requests.interaction = () =>
                client
                    .request(refresh, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Accept: 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                            'X-XSRF-TOKEN': client.cookie('XSRF-TOKEN'),
                        },
                        body,
                    })
                    .then((response) => check(response, `${label} live update`, 'BENCH VALUE'))
            requests.interactionRequestBytes = Buffer.byteLength(body)
        }

        if (scenario.interaction === 'global-search') {
            const endpoint = findKey(inertia.props, 'endpoints')?.globalSearch

            if (typeof endpoint !== 'string')
                throw new Error(`${label}: the panel has no global search endpoint`)

            requests.interaction = () =>
                client
                    .request(
                        `${endpoint}${endpoint.includes('?') ? '&' : '?'}search=${encodeURIComponent(searchTerm)}`,
                        {
                            headers: {
                                Accept: 'application/json',
                                'X-Requested-With': 'XMLHttpRequest',
                            },
                        },
                    )
                    .then((response) => check(response, `${label} global search`, searchResult))
        }

        return requests
    }

    // Filament: interactions are Livewire updates of the page's components.
    const { snapshots, csrf, updateUri } = livewireSnapshots(first.text)
    const livewire = (snapshot, updates, calls) => {
        const body = JSON.stringify({
            _token: csrf,
            components: [{ snapshot: snapshot.raw, updates, calls }],
        })

        return {
            body,
            run: () =>
                client.request(updateUri, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-Livewire': '',
                    },
                    body,
                }),
        }
    }
    const component = (needle) =>
        snapshots.find((snapshot) => snapshot.parsed.memo?.name?.includes(needle))

    if (scenario.interaction === 'sort') {
        const list = component('list-benchmark-records') ?? component('ListBenchmarkRecords')

        if (!list) throw new Error(`${label}: list component snapshot not found`)

        const call = livewire(list, {}, [
            { path: '', method: 'sortTable', params: ['name', 'asc'] },
        ])
        requests.interaction = () =>
            call.run().then((response) => check(response, `${label} sort`, 'name:asc'))
    }

    if (scenario.interaction === 'live-field') {
        const form = component('form-benchmark') ?? component('FormBenchmark')

        if (!form) throw new Error(`${label}: form component snapshot not found`)

        const call = livewire(form, { 'data.field_1': 'bench value' }, [])
        requests.interaction = () =>
            call.run().then((response) => check(response, `${label} live update`, 'BENCH VALUE'))
        requests.interactionRequestBytes = Buffer.byteLength(call.body)
    }

    if (scenario.interaction === 'global-search') {
        const search = component('GlobalSearch')

        if (!search) throw new Error(`${label}: global search component snapshot not found`)

        const call = livewire(search, { search: searchTerm }, [])
        requests.interaction = () =>
            call.run().then((response) => check(response, `${label} global search`, searchResult))
    }

    return requests
}
