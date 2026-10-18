import inertia from '@inertiajs/vite'
import { wayfinder } from '@laravel/vite-plugin-wayfinder'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import laravel from 'laravel-vite-plugin'
import { bunny } from 'laravel-vite-plugin/fonts'
import { fileURLToPath } from 'node:url'
import { defineConfig, lazyPlugins, type Plugin } from 'vite-plus'
// The live examples' Svelte frame (resources/js/examples) is compiled with the workspace
// renderer's own Svelte plugin: the docs app itself is React.
import { svelte } from '../packages/svelte/node_modules/@sveltejs/vite-plugin-svelte/src/index.js'

/** A package of a workspace renderer, for the Vue and Svelte example frames. */
const workspace = (path: string): string =>
    fileURLToPath(new URL(`../packages/${path}`, import.meta.url))

/**
 * Vue, Svelte and their Inertia adapters are not dependencies of the docs app: only the
 * example frames import them, so they resolve as if imported from the workspace renderer
 * that depends on them (subpaths and package exports included).
 */
function workspaceRenderers(): Plugin {
    const owners: Array<[RegExp, string]> = [
        [/^(vue|@vue\/.*|@inertiajs\/vue3)(\/.*)?$/, workspace('vue/package.json')],
        [/^(svelte|@inertiajs\/svelte|esm-env)(\/.*)?$/, workspace('svelte/package.json')],
    ]

    return {
        name: 'alfakit-docs:workspace-renderers',
        enforce: 'pre',
        async resolveId(source, importer, options) {
            const owner = owners.find(([pattern]) => pattern.test(source))?.[1]

            if (!owner || importer?.startsWith(workspace(''))) return null

            return this.resolve(source, owner, { ...options, skipSelf: true })
        },
    }
}

export default defineConfig({
    plugins: lazyPlugins(() => [
        laravel({
            input: [
                'resources/css/app.css',
                'resources/js/app.tsx',
                'resources/css/alfakit.css',
                'resources/js/alfakit/app.tsx',
                // Live examples in the docs, one iframe per renderer.
                'resources/css/examples-react.css',
                'resources/css/examples-vue.css',
                'resources/css/examples-svelte.css',
                'resources/js/examples/react.tsx',
                'resources/js/examples/vue.js',
                'resources/js/examples/svelte.js',
            ],
            refresh: true,
            fonts: [
                bunny('Instrument Sans', {
                    weights: [400, 500, 600],
                }),
            ],
        }),
        inertia(),
        react(),
        babel({
            presets: [reactCompilerPreset()],
            // The React Compiler is for React code: never the Vue and Svelte renderers.
            exclude: [
                /[/\\]node_modules[/\\]/,
                /\/packages\/(vue|svelte)\//,
                /\.svelte(\.[jt]s)?$/,
            ],
        }),
        workspaceRenderers(),
        svelte(),
        tailwindcss(),
        wayfinder({
            formVariants: true,
        }),
    ]),
    resolve: {
        alias: [
            { find: /^@alfakit\/vue$/, replacement: workspace('vue/dist/index.js') },
            { find: /^@alfakit\/svelte$/, replacement: workspace('svelte/dist/index.js') },
        ],
    },
    server: {
        watch: {
            ignored: [
                '**/.agents/**',
                '**/.claude/**',
                '**/.cursor/**',
                '**/.junie/**',
                '**/vendor/**',
            ],
        },
    },
    lint: {
        ignorePatterns: [
            'vendor/**',
            'node_modules/**',
            'public/**',
            'bootstrap/ssr/**',
            'tailwind.config.js',
            'resources/js/actions/**',
            'resources/js/components/ui/*',
            'resources/js/routes/**',
            'resources/js/wayfinder/**',
        ],
        options: {
            denyWarnings: true,
            typeAware: true,
        },
    },
    fmt: {
        printWidth: 80,
        tabWidth: 4,
        singleQuote: true,
        semi: true,
        singleAttributePerLine: false,
        htmlWhitespaceSensitivity: 'css',
        ignorePatterns: [
            '.github/**',
            'composer.json',
            'resources/js/components/ui/*',
            'resources/views/mail/*',
        ],
        sortTailwindcss: {
            functions: ['clsx', 'cn', 'cva'],
            stylesheet: 'resources/css/app.css',
        },
    },
})
