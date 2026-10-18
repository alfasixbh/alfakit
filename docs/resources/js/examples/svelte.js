// A live example of the docs rendered by @alfakit/svelte, in an iframe next to its code
// (resources/views/examples.blade.php). The docs app is React; svelte and @alfakit/svelte
// are resolved from the workspace package (see vite.config.ts).
import { createInertiaApp } from '@inertiajs/svelte'
import { mount } from 'svelte'
import ExampleFrame from './ExampleFrame.svelte'

// The Svelte adapter mounts into #app, which <x-inertia::app /> leaves to the client.
if (!document.getElementById('app')) {
    const target = document.createElement('div')
    target.id = 'app'
    document.body.prepend(target)
}

void createInertiaApp({
    resolve: () => ({ default: ExampleFrame }),
    setup({ el, App, props }) {
        mount(App, { target: el, props })
    },
    progress: false,
})
