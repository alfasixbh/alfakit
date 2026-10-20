// Reads the documentation the harness follows: commands are checked to still appear in the
// docs (so the harness and the docs cannot drift apart), PHP examples are linted for missing
// imports, and the widget example is copied into the app verbatim.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export const DOC_PAGES = [
    'getting-started/installation.md',
    'getting-started/setup-wizard.md',
    'getting-started/starter-kits.md',
    'getting-started/quick-start.md',
    'resources/nested-resources.md',
    'widgets/overview.md',
]

export function readDoc(repo, page) {
    return readFileSync(join(repo, 'docs/content', page), 'utf8')
}

/** Every fenced block of a language, with the heading it sits under. */
export function codeBlocks(markdown, lang) {
    const blocks = []
    let heading = ''
    const lines = markdown.split('\n')
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (/^#{1,6} /.test(line)) heading = line.replace(/^#+ /, '')
        if (line.trim() === '```' + lang) {
            const body = []
            for (i++; i < lines.length && lines[i].trim() !== '```'; i++) body.push(lines[i])
            blocks.push({ heading, code: body.join('\n') })
        }
    }
    return blocks
}

/** The StatsOverviewWidget example of widgets/overview.md, as a PHP file. */
export function widgetExample(repo) {
    const block = codeBlocks(readDoc(repo, 'widgets/overview.md'), 'php').find(
        (b) => b.heading === 'StatsOverviewWidget' && b.code.includes('class BlogStats'),
    )
    if (!block)
        throw new Error('widgets/overview.md has no BlogStats example under "StatsOverviewWidget"')
    return block.code.startsWith('<?php') ? `${block.code}\n` : `<?php\n\n${block.code}\n`
}

const ELOQUENT_NAMES =
    /^(BelongsTo|BelongsToMany|HasMany|HasOne|HasManyThrough|HasOneThrough|MorphTo|MorphMany|MorphOne|MorphToMany|HasFactory|SoftDeletes|Builder|Collection|Model|Factory|Attribute|Carbon|Str|Arr)$/

const PHP_KEYWORDS = new Set([
    'self',
    'static',
    'parent',
    'PHP_EOL',
    'TRUE',
    'FALSE',
    'NULL',
    'E_ALL',
])

/**
 * Missing imports in the complete PHP examples (blocks with a `namespace` or `<?php`) of the
 * pages the harness follows. Fragments (method bodies) are skipped: the docs list their
 * imports separately.
 */
export function lintImports(repo) {
    const problems = []
    for (const page of DOC_PAGES) {
        for (const { heading, code } of codeBlocks(readDoc(repo, page), 'php')) {
            if (!/^\s*(<\?php|namespace\s)/m.test(code) || !/^\s*namespace\s/m.test(code)) continue
            const known = new Set()
            for (const [, path, alias] of code.matchAll(
                /^use\s+([\w\\]+)(?:\s+as\s+(\w+))?\s*;/gm,
            )) {
                known.add(alias ?? path.split('\\').pop())
            }
            for (const [, name] of code.matchAll(
                /^\s*(?:final\s+|abstract\s+)?(?:class|interface|trait|enum)\s+(\w+)/gm,
            )) {
                known.add(name)
            }
            const namespace = code.match(/^\s*namespace\s+([\w\\]+)/m)?.[1] ?? ''
            // Strip strings and comments so class names in them are not counted.
            const stripped = code
                .replace(/\/\/.*$/gm, '')
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .replace(/'(?:\\.|[^'\\])*'/g, "''")
                .replace(/"(?:\\.|[^"\\])*"/g, '""')
                .replace(/^use\s+.*$/gm, '')
                .replace(/^\s*namespace\s+.*$/gm, '')
            const references = new Set()
            const patterns = [
                /(\\?(?:[A-Z]\w*\\)*[A-Z]\w*)::/g, // Foo::bar, Pages\ListFoo::route
                /\bnew\s+(\\?(?:[A-Z]\w*\\)*[A-Z]\w*)/g,
                /\b(?:extends|implements|instanceof)\s+(\\?(?:[A-Z]\w*\\)*[A-Z]\w*)/g,
                /[(,]\s*\??(\\?(?:[A-Z]\w*\\)*[A-Z]\w*)\s+\$\w+/g, // parameter types
                /\)\s*:\s*\??(\\?(?:[A-Z]\w*\\)*[A-Z]\w*)/g, // return types
                /\?(\\?(?:[A-Z]\w*\\)*[A-Z]\w*)\s+\$\w+/g, // nullable property types
                /#\[(\\?(?:[A-Z]\w*\\)*[A-Z]\w*)/g, // attributes
            ]
            for (const pattern of patterns) {
                for (const [, ref] of stripped.matchAll(pattern)) references.add(ref)
            }
            for (const ref of references) {
                if (ref.startsWith('\\')) continue
                const first = ref.split('\\')[0]
                if (known.has(first) || PHP_KEYWORDS.has(first)) continue
                // Same-namespace application classes (PostResource next to CommentResource) resolve
                // without an import; anything else must be imported.
                if (
                    namespace.startsWith('App\\') &&
                    /(Resource|Widget|Page|Seeder|Policy|Plugin)$/.test(first)
                )
                    continue
                if (namespace === 'App\\Models' && !ELOQUENT_NAMES.test(first)) continue // sibling models
                problems.push(`${page} (${heading || 'top'}): \`${ref}\` is used but not imported`)
            }
        }
    }
    return problems
}

/** The commands the harness runs and the doc page that must still show them. */
export const DOCUMENTED_COMMANDS = [
    ['getting-started/installation.md', 'php artisan alfakit:setup'],
    ['getting-started/setup-wizard.md', '--mode=panel\\|starter-kit\\|standalone'],
    ['getting-started/setup-wizard.md', '--users'],
    ['getting-started/setup-wizard.md', '--migrate'],
    ['getting-started/setup-wizard.md', '--admin-email='],
    ['getting-started/installation.md', 'php artisan make:alfakit-resource Post --generate'],
    ['getting-started/installation.md', 'Add `--view` for a view page'],
    ['resources/nested-resources.md', 'make:alfakit-resource Comment --nested=PostResource'],
    ['resources/nested-resources.md', 'Reply --nested=CommentResource'],
    ['getting-started/quick-start.md', 'php artisan make:alfakit-widget BlogStats --type=stats'],
    ['widgets/overview.md', 'php artisan make:alfakit-widget BlogStats --type=stats'],
    ['getting-started/installation.md', 'php artisan alfakit:doctor'],
    ['getting-started/installation.md', 'composer require alfasix/alfakit-translations'],
    ['getting-started/installation.md', "->locales(['en', 'ar'"],
    ['getting-started/starter-kits.md', 'composer require alfasix/alfakit'],
]

export function missingDocumentedCommands(repo) {
    return DOCUMENTED_COMMANDS.filter(([page, text]) => !readDoc(repo, page).includes(text)).map(
        ([page, text]) => `${page} no longer contains: ${text}`,
    )
}
