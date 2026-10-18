import { CmsPage, createAlfakit } from '@alfakit/react'

/**
 * Alfakit panel entry point.
 *
 * Register your own components here: custom pages (static::$component), View schema
 * components, custom widgets, or overrides for built-in renderers.
 */
void createAlfakit({
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
})
