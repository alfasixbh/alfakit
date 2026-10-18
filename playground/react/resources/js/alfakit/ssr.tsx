import { CmsPage } from '@alfakit/react'
import { createAlfakitServer } from '@alfakit/react/server'
import createServer from '@inertiajs/react/server'

/**
 * Alfakit server-side rendering entry (`npm run build:ssr`, then
 * `php artisan inertia:start-ssr`).
 *
 * Register the same components and pages as resources/js/alfakit/app.tsx so the server
 * renders the tree the browser hydrates. Pages without the `alfakit` prop (the rest of
 * the app) are rendered in the browser.
 */
createServer(
    createAlfakitServer({
        // Components in ./fields, ./columns, ./entries, ./widgets, ./pages, ./components and
        // ./blocks register themselves under their file name (fields/SwatchPicker.tsx).
        discover: import.meta.glob(
            './{fields,columns,entries,widgets,pages,components,blocks}/**/*.tsx',
        ),
        components: {
            // 'map-picker': MapPicker,
        },
        pages: {
            // 'Custom/Reports': ReportsPage,
            // alfasix/alfakit-cms: public pages under /site render through the panel's renderer.
            'Alfakit/CmsPage': CmsPage,
        },
    }),
    // Each playground has its own port so all three SSR servers can run at once.
    { port: 13714 },
)
