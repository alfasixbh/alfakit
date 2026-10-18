/// <reference types="vite/client" />

// Plain `tsc` (and svelte-check) do not understand .vue modules; vue-tsc does.
declare module '*.vue' {
    import type { DefineComponent } from 'vue'

    const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
    export default component
}
