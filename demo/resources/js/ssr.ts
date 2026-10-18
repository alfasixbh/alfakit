import { createAlfakitServer as createReactServer } from '@alfakit/react/server'
import { createAlfakitServer as createSvelteServer } from '@alfakit/svelte/server'
import { createAlfakitServer as createVueServer } from '@alfakit/vue/server'
import type { InertiaAppResponse, Page } from '@inertiajs/core'
import createServer from '@inertiajs/core/server'
import { components as reactComponents } from './react/components'
import { pages as reactPages } from './react/storefront/pages'
import { components as svelteComponents } from './svelte/components'
import { pages as sveltePages } from './svelte/storefront/pages'
import { components as vueComponents } from './vue/components'
import { pages as vuePages } from './vue/storefront/pages'

/**
 * One SSR server for the three panels and the three storefronts (`pnpm build:ssr`, then
 * `node bootstrap/ssr/ssr.js`, port 13720). Panel pages carry `alfakit.id` (the renderer name);
 * storefront pages carry the shared `renderer` prop. Each server renders its panel pages and
 * the storefront pages registered with it, so the browser hydrates the same tree.
 */
const renderers: Record<string, (page: Page) => InertiaAppResponse> = {
    react: createReactServer({ components: reactComponents, pages: reactPages }),
    vue: createVueServer({ components: vueComponents, pages: vuePages }),
    svelte: createSvelteServer({ components: svelteComponents, pages: sveltePages }),
}

createServer(
    (page) => {
        const props = page.props as { alfakit?: { id?: string }; renderer?: string }
        const render = renderers[props.alfakit?.id ?? props.renderer ?? '']

        // `null` tells Laravel to fall back to client-side rendering.
        return render ? render(page) : (null as unknown as InertiaAppResponse)
    },
    { port: 13720 },
)
