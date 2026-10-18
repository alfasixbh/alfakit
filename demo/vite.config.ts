import inertia from '@inertiajs/vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import vue from '@vitejs/plugin-vue'
import laravel from 'laravel-vite-plugin'
import { defineConfig, lazyPlugins } from 'vite-plus'

/**
 * One Vite build for the three renderers: a client entry per framework (the panel at
 * /{renderer}/admin and the storefront at /{renderer} share it) and one SSR entry that
 * dispatches on the panel id.
 */
export default defineConfig({
    plugins: lazyPlugins(() => [
        laravel({
            input: [
                'resources/css/react.css',
                'resources/js/react/app.tsx',
                'resources/css/vue.css',
                'resources/js/vue/app.ts',
                'resources/css/svelte.css',
                'resources/js/svelte/app.ts',
            ],
            ssr: 'resources/js/ssr.ts',
            refresh: true,
        }),
        inertia({ ssr: 'resources/js/ssr.ts' }),
        react({ include: /resources\/js\/react\/.*\.[tj]sx?$/ }),
        vue(),
        svelte(),
        tailwindcss(),
    ]),
    // The renderers are linked from the workspace: bundle everything into the SSR build so
    // one copy of React, Vue and Svelte is used.
    ssr: {
        noExternal: true,
    },
    server: {
        watch: {
            ignored: ['**/.claude/**', '**/vendor/**', '**/storage/**'],
        },
    },
    lint: {
        ignorePatterns: [
            'vendor/**',
            'node_modules/**',
            'public/**',
            'bootstrap/ssr/**',
            'storage/**',
        ],
        options: {
            denyWarnings: true,
            typeAware: true,
        },
    },
    fmt: {
        printWidth: 100,
        tabWidth: 4,
        singleQuote: true,
        semi: false,
        singleAttributePerLine: false,
        htmlWhitespaceSensitivity: 'css',
        ignorePatterns: ['composer.json', 'public/**', 'bootstrap/ssr/**'],
        sortTailwindcss: {
            functions: ['clsx', 'cn', 'cva'],
            stylesheet: 'resources/css/react.css',
        },
    },
})
