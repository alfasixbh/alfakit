import { AlfakitComponent, type StandaloneComponentSchema } from '@alfakit/react'
import { createInertiaApp } from '@inertiajs/react'
import { createRoot } from 'react-dom/client'

/**
 * A live example of the docs rendered by @alfakit/react, in an iframe next to its code
 * (resources/views/examples.blade.php). It is a small Inertia app of its own, so actions,
 * validation, redirects and toasts behave exactly as in an application.
 */
function ExampleFrame({ example }: { example: StandaloneComponentSchema }) {
    return <AlfakitComponent component={example} />
}

void createInertiaApp({
    resolve: () => ExampleFrame,
    setup({ el, App, props }) {
        createRoot(el).render(<App {...props} />)
    },
    progress: false,
})
