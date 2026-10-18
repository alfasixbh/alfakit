import { CmsPage, createAlfakit } from '@alfakit/vue'

/**
 * Alfakit panel entry point.
 *
 * Register your own components here: custom pages (static::$component), View schema
 * components, custom widgets, or overrides for built-in renderers.
 */
void createAlfakit({
    // Components in ./fields, ./columns, ./entries, ./widgets, ./pages, ./components and
    // ./blocks register themselves under their file name (fields/SwatchPicker.vue).
    discover: import.meta.glob(
        './{fields,columns,entries,widgets,pages,components,blocks}/**/*.vue',
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
