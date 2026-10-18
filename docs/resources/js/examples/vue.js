// A live example of the docs rendered by @alfakit/vue, in an iframe next to its code
// (resources/views/examples.blade.php). The docs app is React; vue and @alfakit/vue are
// resolved from the workspace package (see vite.config.ts).
import { AlfakitComponent } from '@alfakit/vue'
import { createInertiaApp } from '@inertiajs/vue3'
import { createApp, defineComponent, h } from 'vue'

const ExampleFrame = defineComponent({
    props: { example: { type: Object, required: true } },
    setup(props) {
        return () => h(AlfakitComponent, { component: props.example })
    },
})

void createInertiaApp({
    resolve: () => ExampleFrame,
    setup({ el, App, props, plugin }) {
        createApp({ render: () => h(App, props) })
            .use(plugin)
            .mount(el)
    },
    progress: false,
})
