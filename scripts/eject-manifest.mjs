#!/usr/bin/env node
/**
 * Writes `dist/eject-manifest.json` for a renderer package: which source file (and export)
 * renders each registry key, and which source exports are public through the package entry.
 * `php artisan alfakit:eject` reads it to copy a component into an application and rewrite
 * its internal imports to `@alfakit/<adapter>`.
 *
 *   node scripts/eject-manifest.mjs packages/react
 *
 * Registry keys come from `src/registry.ts` (schema types: fields, layout components,
 * entries) plus the fixed keys each renderer resolves itself: `layout:*`, `panel:*`,
 * `column:*` (one cell renderer handles every column type) and `widget:*`.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

const root = resolve(process.argv[2] ?? '.')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const adapter = pkg.name.replace('@alfakit/', '')
const src = join(root, 'src')

const EXTENSIONS = ['.ts', '.tsx', '.svelte.ts', '.vue', '.svelte', '.js']

/** Resolve an import specifier relative to `from` (a file) to an existing source file. */
function resolveFile(from, specifier) {
    const base = resolve(dirname(from), specifier)
    const candidates = [
        base,
        ...EXTENSIONS.map((ext) => base + ext),
        ...EXTENSIONS.map((ext) => join(base, 'index' + ext)),
    ]

    for (const candidate of candidates) {
        if (existsSync(candidate) && statSync(candidate).isFile()) {
            return candidate
        }
    }

    return null
}

const rel = (file) => relative(root, file).split('\\').join('/')

/** `import { a, b as c, type D } from './x'` statements of a file: [{ names: [{imported, local}], default: 'Name'|null, specifier }]. */
function parseImports(code) {
    const imports = []
    const pattern =
        /import\s+(type\s+)?(?:([\w$]+)\s*,?\s*)?(?:\{([^}]*)\})?\s*from\s*['"]([^'"]+)['"]/g

    for (const match of code.matchAll(pattern)) {
        const [, , defaultName, named, specifier] = match
        const names = (named ?? '')
            .split(',')
            .map((part) => part.trim().replace(/^type\s+/, ''))
            .filter(Boolean)
            .map((part) => {
                const [imported, local] = part.split(/\s+as\s+/).map((s) => s.trim())

                return { imported, local: local ?? imported }
            })

        imports.push({ names, default: defaultName ?? null, specifier })
    }

    return imports
}

/**
 * Follow re-exports from `file` until the defining file of `name` is found.
 * Returns { file, export } where export is 'default' or the local export name.
 */
function locateExport(file, name, seen = new Set()) {
    if (!file || seen.has(`${file}:${name}`)) return null
    seen.add(`${file}:${name}`)

    const code = readFileSync(file, 'utf8')

    // export { default as Name } from './File.vue' / export { Local as Name, Name } from './x'
    for (const match of code.matchAll(
        /export\s+(type\s+)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g,
    )) {
        for (const part of match[2]
            .split(',')
            .map((s) => s.trim().replace(/^type\s+/, ''))
            .filter(Boolean)) {
            const [local, exported] = part.split(/\s+as\s+/).map((s) => s.trim())

            if ((exported ?? local) === name) {
                const target = resolveFile(file, match[3])

                if (!target) return null
                if (local === 'default') return { file: target, export: 'default' }

                return locateExport(target, local, seen) ?? { file: target, export: local }
            }
        }
    }

    // export * from './x'
    for (const match of code.matchAll(/export\s+\*\s+from\s*['"]([^'"]+)['"]/g)) {
        const found = locateExport(resolveFile(file, match[1]), name, seen)

        if (found) return found
    }

    // Defined here: export function/const/class/… Name
    if (
        new RegExp(
            `export\\s+(?:async\\s+)?(?:function|const|let|class|interface|type|enum)\\s+${name}\\b`,
        ).test(code)
    ) {
        return { file, export: name }
    }

    if (new RegExp(`export\\s+\\{[^}]*\\b${name}\\b[^}]*\\}(?!\\s*from)`).test(code)) {
        return { file, export: name }
    }

    if (/\.(vue|svelte)$/.test(file)) {
        return { file, export: 'default' }
    }

    return null
}

/** Registry entries `Key: Identifier` of `src/registry.ts`, resolved to files. */
function registryComponents() {
    const registryFile = join(src, 'registry.ts')
    const code = readFileSync(registryFile, 'utf8')
    const imports = parseImports(code)
    const byLocal = new Map()

    for (const entry of imports) {
        if (!entry.specifier.startsWith('.')) continue

        const target = resolveFile(registryFile, entry.specifier)

        for (const { imported, local } of entry.names) byLocal.set(local, { target, imported })
        if (entry.default) byLocal.set(entry.default, { target, imported: 'default' })
    }

    const body = code.slice(code.indexOf('new ComponentRegistry'))
    const components = {}

    for (const match of body.matchAll(/^\s*([A-Za-z][\w]*|'[^']+'):\s*([A-Za-z][\w]*)\s*,/gm)) {
        const key = match[1].replace(/^'|'$/g, '')
        const source = byLocal.get(match[2])

        if (!source?.target) continue

        const located =
            source.imported === 'default'
                ? { file: source.target, export: 'default' }
                : (locateExport(source.target, source.imported) ?? {
                      file: source.target,
                      export: source.imported,
                  })

        components[key] = { file: rel(located.file), export: located.export, name: match[2] }
    }

    return components
}

/** Files that render the keys the renderers resolve themselves (layouts, panel parts, columns, widgets). */
function fixedComponents() {
    const fixed = {
        react: {
            'layout:app': ['src/layouts/app-layout.tsx', 'AppLayout'],
            'layout:auth': ['src/layouts/auth-layout.tsx', 'AuthLayout'],
            'layout:blank': ['src/layouts/blank-layout.tsx', 'BlankLayout'],
            'panel:sidebar': ['src/components/panel/app-sidebar.tsx', 'AppSidebar'],
            'panel:topbar': ['src/components/panel/topbar.tsx', 'Topbar'],
            'panel:sub-navigation': ['src/components/panel/sub-navigation.tsx', 'SubNavigation'],
            'panel:impersonation-banner': [
                'src/components/panel/impersonation-banner.tsx',
                'ImpersonationBanner',
            ],
            'panel:debug-panel': ['src/components/panel/debug-panel.tsx', 'DebugPanel'],
            'panel:bottom-nav': ['src/components/panel/bottom-nav.tsx', 'BottomNav'],
            'panel:language-switcher': [
                'src/components/panel/locale-switcher.tsx',
                'LocaleSwitcher',
            ],
            'column:*': ['src/components/table/cells.tsx', 'TableCellContent'],
            'widget:Chart': ['src/components/widgets/chart.tsx', 'ChartWidget'],
            'widget:StatsOverviewWidget': [
                'src/components/widgets/stats-overview.tsx',
                'StatsOverviewWidget',
            ],
            'widget:TableWidget': ['src/components/table/table-block.tsx', 'DataTable'],
        },
        vue: {
            'layout:app': ['src/layouts/AppLayout.vue', 'default'],
            'layout:auth': ['src/layouts/AuthLayout.vue', 'default'],
            'layout:blank': ['src/layouts/BlankLayout.vue', 'default'],
            'panel:sidebar': ['src/components/panel/AppSidebar.vue', 'default'],
            'panel:topbar': ['src/components/panel/Topbar.vue', 'default'],
            'panel:sub-navigation': ['src/components/panel/SubNavigation.vue', 'default'],
            'panel:impersonation-banner': [
                'src/components/panel/ImpersonationBanner.vue',
                'default',
            ],
            'panel:debug-panel': ['src/components/panel/DebugPanel.vue', 'default'],
            'panel:bottom-nav': ['src/components/panel/BottomNav.vue', 'default'],
            'panel:language-switcher': ['src/components/panel/LocaleSwitcher.vue', 'default'],
            'column:*': ['src/components/table/TableCellContent.vue', 'default'],
            'widget:Chart': ['src/components/widgets/ChartWidget.vue', 'default'],
            'widget:StatsOverviewWidget': [
                'src/components/widgets/StatsOverviewWidget.vue',
                'default',
            ],
            'widget:TableWidget': ['src/components/table/DataTable.vue', 'default'],
        },
        svelte: {
            'layout:app': ['src/layouts/AppLayout.svelte', 'default'],
            'layout:auth': ['src/layouts/AuthLayout.svelte', 'default'],
            'layout:blank': ['src/layouts/BlankLayout.svelte', 'default'],
            'panel:sidebar': ['src/components/panel/AppSidebar.svelte', 'default'],
            'panel:topbar': ['src/components/panel/Topbar.svelte', 'default'],
            'panel:sub-navigation': ['src/components/panel/SubNavigation.svelte', 'default'],
            'panel:impersonation-banner': [
                'src/components/panel/ImpersonationBanner.svelte',
                'default',
            ],
            'panel:debug-panel': ['src/components/panel/DebugPanel.svelte', 'default'],
            'panel:bottom-nav': ['src/components/panel/BottomNav.svelte', 'default'],
            'panel:language-switcher': ['src/components/panel/LocaleSwitcher.svelte', 'default'],
            'column:*': ['src/components/table/TableCellContent.svelte', 'default'],
            'widget:Chart': ['src/components/widgets/ChartWidget.svelte', 'default'],
            'widget:StatsOverviewWidget': [
                'src/components/widgets/StatsOverviewWidget.svelte',
                'default',
            ],
            'widget:TableWidget': ['src/components/table/DataTable.svelte', 'default'],
        },
    }

    const components = {}

    for (const [key, [file, name]] of Object.entries(fixed[adapter] ?? {})) {
        if (!existsSync(join(root, file))) continue

        components[key] = {
            file,
            export: name,
            name: name === 'default' ? basenameWithoutExtension(file) : name,
        }
    }

    return components
}

function basenameWithoutExtension(file) {
    return file
        .split('/')
        .pop()
        .replace(/\.(vue|svelte|tsx?|js)$/, '')
}

/**
 * Everything exported by the package entry: { "src/path": { localExport: publicName } }.
 * `export *` chains are followed; names from `.ts(x)` files reached that way are read from
 * their own `export` declarations.
 */
function publicExports() {
    const entry = join(src, 'index.ts')
    const result = {}
    const add = (file, local, name) => {
        const key = rel(file)
        result[key] ??= {}
        result[key][local] = name
    }

    /** Walk a module and return the public names it exports (they are importable from it too). */
    const walk = (file, seen = new Set()) => {
        if (!file || seen.has(file)) return []
        seen.add(file)

        const code = readFileSync(file, 'utf8')
        const names = []

        for (const match of code.matchAll(
            /export\s+(type\s+)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g,
        )) {
            const target = resolveFile(file, match[3])

            if (!target) continue

            for (const part of match[2]
                .split(',')
                .map((s) => s.trim().replace(/^type\s+/, ''))
                .filter(Boolean)) {
                const [local, exported] = part.split(/\s+as\s+/).map((s) => s.trim())
                const name = exported ?? local

                names.push(name)

                if (local === 'default') {
                    add(target, 'default', name)
                    continue
                }

                const located = locateExport(target, local)

                if (located) add(located.file, located.export, name)
                else add(target, local, name)
            }
        }

        for (const match of code.matchAll(/export\s+\*\s+from\s*['"]([^'"]+)['"]/g)) {
            const target = resolveFile(file, match[1])

            if (!target) continue

            names.push(...walk(target, seen))

            if (/\.tsx?$/.test(target)) {
                const inner = readFileSync(target, 'utf8')

                for (const declaration of inner.matchAll(
                    /export\s+(?:async\s+)?(?:function|const|let|class|interface|type|enum)\s+([\w$]+)/g,
                )) {
                    add(target, declaration[1], declaration[1])
                    names.push(declaration[1])
                }

                for (const list of inner.matchAll(/export\s+(type\s+)?\{([^}]*)\}(?!\s*from)/g)) {
                    for (const part of list[2]
                        .split(',')
                        .map((s) => s.trim().replace(/^type\s+/, ''))
                        .filter(Boolean)) {
                        const [local, exported] = part.split(/\s+as\s+/).map((s) => s.trim())
                        add(target, local, exported ?? local)
                        names.push(exported ?? local)
                    }
                }
            }
        }

        // A barrel (index.ts) re-exporting public names is itself a public import target.
        if (file !== entry) {
            for (const name of names) add(file, name, name)
        }

        return names
    }

    walk(entry)

    return result
}

const manifest = {
    package: pkg.name,
    version: pkg.version,
    adapter,
    generatedAt: new Date().toISOString(),
    components: { ...registryComponents(), ...fixedComponents() },
    public: publicExports(),
}

mkdirSync(join(root, 'dist'), { recursive: true })
writeFileSync(join(root, 'dist', 'eject-manifest.json'), JSON.stringify(manifest, null, 2) + '\n')

const count = Object.keys(manifest.components).length
const files = readdirSync(src).length

console.log(
    `eject-manifest: ${count} registry keys, ${Object.keys(manifest.public).length} public source files (${files} entries in src/) → dist/eject-manifest.json`,
)
