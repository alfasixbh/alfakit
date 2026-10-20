#!/usr/bin/env node
// Fresh-install acceptance harness: creates a brand-new Laravel starter-kit app, installs
// AlfaKit from this monorepo exactly as the docs say, and drives a browser through what a
// new user does. See scripts/acceptance/README.md.
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { APP_PREFIX, App, buildTarballs } from './lib/app.mjs'
import { loadPlaywright, openSession } from './lib/browser.mjs'
import { lintImports, missingDocumentedCommands, widgetExample } from './lib/docs.mjs'
import { crawl, runJourneys } from './lib/journeys.mjs'
import { Report, skip } from './lib/report.mjs'
import { log, mustRun, run, setLogFile, shortId, tail } from './lib/util.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = resolve(HERE, '../..')
const RENDERERS = ['react', 'vue', 'svelte']
const MODES = ['starter-kit', 'panel']

// ------------------------------------------------------------------ arguments
const args = Object.fromEntries(
    process.argv.slice(2).map((arg) => {
        const [key, ...value] = arg.replace(/^--/, '').split('=')
        return [key, value.length ? value.join('=') : true]
    }),
)
if (args.help) {
    console.log(`Usage: node scripts/acceptance/run.mjs [--renderer=react|vue|svelte|all] [--mode=starter-kit|panel|all]
       [--keep] [--serve] [--apps-dir=<dir>] [--tarballs=<dir with prebuilt .tgz>]
       [--reuse=<kept app name> --renderer=<r> --mode=<m>]   re-run only the browser journeys`)
    process.exit(0)
}
const pick = (value, all, fallback) =>
    value === 'all' ? all : String(value ?? fallback).split(',')
const renderers = pick(args.renderer, RENDERERS, 'all')
const modes = pick(args.mode, MODES, 'all')
for (const r of renderers) if (!RENDERERS.includes(r)) throw new Error(`Unknown renderer ${r}`)
for (const m of modes) if (!MODES.includes(m)) throw new Error(`Unknown mode ${m}`)
const serve = Boolean(args.serve) || process.platform !== 'darwin'
const keep = Boolean(args.keep)
const appsDir = resolve(
    String(
        args['apps-dir'] ??
            (serve ? join(tmpdir(), 'alfakit-acceptance') : join(homedir(), 'Herd')),
    ),
)
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-')
const reportsDir = join(HERE, 'reports')
mkdirSync(reportsDir, { recursive: true })
mkdirSync(appsDir, { recursive: true })
setLogFile(join(reportsDir, `${stamp}-run.log`))

const version = (() => {
    const tag = run('git', ['describe', '--tags', '--abbrev=0'], { cwd: REPO }).stdout.trim()
    return /^v?\d+\.\d+\.\d+$/.test(tag) ? tag.replace(/^v/, '') : '0.1.99'
})()
const commit = run('git', ['rev-parse', '--short', 'HEAD'], { cwd: REPO }).stdout.trim()

let current = null
const onSignal = () => {
    log('Interrupted: cleaning up')
    current?.stop()
    if (current && !keep && !args.reuse) current.cleanup()
    process.exit(130)
}
process.on('SIGINT', onSignal)
process.on('SIGTERM', onSignal)

// ------------------------------------------------------------------ once per run
const global = []
const record = async (id, title, fn) => {
    const entry = { id, title, status: 'PASS', detail: '' }
    try {
        entry.detail = (await fn()) ?? ''
    } catch (error) {
        entry.status = 'FAIL'
        entry.detail = String(error.message ?? error)
    }
    log(`${entry.status} ${id} ${title}${entry.status === 'FAIL' ? `\n${entry.detail}` : ''}`)
    global.push(entry)
    return entry
}

await record('G01', 'The docs still show every command the harness runs', () => {
    const missing = missingDocumentedCommands(REPO)
    if (missing.length) throw new Error(missing.join('\n'))
    return 'installation, setup-wizard, starter-kits, quick-start, nested-resources, widgets/overview'
})
await record('G02', 'Complete PHP examples in those docs import every class they use', () => {
    const problems = lintImports(REPO)
    if (problems.length) throw new Error(problems.join('\n'))
})
let tarballs = null
const tarballStep = await record(
    'G03',
    `Build and pack @alfakit/core and ${renderers.join(', ')} (local tarballs)`,
    () => {
        if (args.reuse) return 'not needed with --reuse'
        const dir = args.tarballs
            ? resolve(String(args.tarballs))
            : join(tmpdir(), `alfakit-acceptance-tarballs-${stamp}`)
        tarballs = buildTarballs(REPO, renderers, dir)
        return Object.values(tarballs).join('\n')
    },
)

const playwright = loadPlaywright(REPO)
const results = []

for (const renderer of renderers) {
    for (const mode of modes) {
        results.push(await runCell(renderer, mode))
    }
}

log('\n==== Summary')
for (const { renderer, mode, report } of results) {
    const { PASS, FAIL, SKIP } = report.counts
    log(
        `${FAIL ? 'FAIL' : 'PASS'}  ${renderer} × ${mode}: ${PASS} passed, ${FAIL} failed, ${SKIP} skipped → ${report.mdPath}`,
    )
}
process.exit(
    results.some(({ report }) => report.failed) || global.some((g) => g.status === 'FAIL') ? 1 : 0,
)

// ------------------------------------------------------------------ one matrix cell
async function runCell(renderer, mode) {
    const reuse = typeof args.reuse === 'string' ? args.reuse : null
    const name = reuse ?? `${APP_PREFIX}${renderer}-${mode}-${shortId()}`
    const app = new App({ repo: REPO, renderer, mode, parentDir: appsDir, name, serve })
    current = app
    const credentials = {
        name: 'Acceptance Admin',
        email: `acc-admin-${shortId()}@example.test`,
        password: `Acc-${randomBytes(9).toString('base64url')}`,
    }
    const report = new Report({
        dir: join(reportsDir, `${stamp}-${renderer}-${mode}`),
        name,
        renderer,
        mode,
        meta: {
            App: `${app.dir}${keep ? ' (kept)' : ' (removed afterwards)'}`,
            Server: serve ? 'php artisan serve' : 'Herd',
            Commit: commit,
            'Package version given to the path repository': version,
            Started: new Date().toISOString(),
        },
    })
    log(`\n==== ${renderer} × ${mode}: ${app.dir}`)

    for (const entry of global) {
        await report.step(entry.id, entry.title, () => {
            if (entry.status === 'FAIL') throw new Error(entry.detail)
            return entry.detail
        })
    }

    const ids = {}
    let routes = []
    let session = null
    let logMark = 0
    const cli = (id, title, fn, options = {}) =>
        report.step(id, title, fn, { needs: ['app'], ...options })

    try {
        if (reuse) {
            // --reuse=<app>: re-run the browser journeys against an app kept with --keep.
            await cli(
                'R01',
                `Reuse ${app.dir}`,
                async () => {
                    const saved = JSON.parse(readFileSync(app.path('.acceptance.json'), 'utf8'))
                    Object.assign(ids, saved.ids)
                    if (mode === 'panel') Object.assign(credentials, saved.credentials)
                    app.url = saved.url
                    app.linked = !serve
                    if (serve) await app.start()
                    const result = mustRun('php', ['artisan', 'route:list', '--json'], {
                        cwd: app.dir,
                    })
                    routes = JSON.parse(result.stdout.slice(result.stdout.indexOf('[')))
                    logMark = app.logSize()
                    return JSON.stringify(ids)
                },
                { needs: [], blocks: 'app' },
            )
            report.meta.URL = app.url
        } else {
            await cli(
                'A01',
                `laravel new ${name} --${renderer} --database=sqlite --pest --npm --no-boost --no-interaction`,
                () => {
                    if (tarballStep.status === 'FAIL')
                        throw new Error('the tarballs were not built (G03)')
                    const result = app.create()
                    return tail(result.output, 5)
                },
                { needs: [], blocks: 'app' },
            )

            await cli(
                'A02',
                serve ? 'Start php artisan serve' : 'herd link (no name) and wait for the site',
                async () => {
                    await app.start()
                    const request = await playwright.request.newContext()
                    try {
                        const status = await app.waitUntilUp(request)
                        return `${app.url} answered HTTP ${status}`
                    } finally {
                        await request.dispose()
                    }
                },
                { blocks: 'app' },
            )
            report.meta.URL = app.url

            await cli(
                'A03',
                'composer require "alfasix/alfakit:@dev" from a path repository (snapshot, minimum-stability dev)',
                () => {
                    const result = app.installPhpPackage(version)
                    const source = app.composerSource('alfasix/alfakit')
                    if (source?.dist !== 'path')
                        throw new Error(
                            `alfasix/alfakit was installed from ${JSON.stringify(source)}, not the monorepo path repository`,
                        )
                    return `${JSON.stringify(source)}\n${tail(result.output, 4)}`
                },
                { blocks: 'app' },
            )

            await cli(
                'A04',
                `npm install the local @alfakit/core and @alfakit/${renderer} tarballs`,
                () => {
                    const result = app.installTarballs(tarballs)
                    app.appendToGitignore()
                    return tail(result.output, 3)
                },
                { blocks: 'app' },
            )

            // -------------------------------------------------------------- the setup wizard
            const setupArgs = [
                'alfakit:setup',
                `--mode=${mode}`,
                '--users',
                '--migrate',
                '--no-interaction',
            ]
            if (mode === 'panel')
                setupArgs.splice(
                    4,
                    0,
                    `--admin-email=${credentials.email}`,
                    `--admin-password=${credentials.password}`,
                )
            await cli(
                'A05',
                `php artisan ${setupArgs.join(' ').replace(credentials.password, '••••')}`,
                () => {
                    const result = app.artisan(setupArgs, { timeout: 1_200_000 })
                    writeFileSync(
                        report.artifact('setup-output.txt'),
                        result.output.replaceAll(credentials.password, '••••'),
                    )
                    if (result.code !== 0)
                        throw new Error(`exit ${result.code}\n${tail(result.output, 40)}`)
                    const failed = result.output
                        .split('\n')
                        .filter(
                            (line) => /\bfailed\b/i.test(line) || /\bERROR\b|Exception/.test(line),
                        )
                    if (failed.length)
                        throw new Error(`The summary reports failures:\n${failed.join('\n')}`)
                    return tail(result.output, 25)
                },
                { blocks: 'setup' },
            )

            await cli('A05a', 'Panel mode: setup created the admin user from --admin-email', () => {
                if (mode !== 'panel') skip('starter-kit mode: users register with the app')
                const exists = app.php(
                    `App\\Models\\User::where('email', '${credentials.email}')->exists()`,
                )
                if (exists) return `${credentials.email} exists`
                // Recovery so the journeys can run: the documented make:alfakit-user.
                const result = app.artisan([
                    'make:alfakit-user',
                    `--name=${credentials.name}`,
                    `--email=${credentials.email}`,
                    `--password=${credentials.password}`,
                ])
                throw new Error(
                    `No user ${credentials.email} after alfakit:setup. Recovery: php artisan make:alfakit-user --name --email --password → exit ${result.code}\n${tail(result.output.replaceAll(credentials.password, '••••'), 5)}`,
                )
            })

            await cli(
                'A06',
                'Setup built the frontend: the Vite manifest has the AlfaKit entry',
                () => {
                    const manifest = app.read('public/build/manifest.json')
                    const entry =
                        mode === 'panel'
                            ? /resources\/js\/alfakit\/app\.(tsx|ts)$/
                            : /resources\/js\/pages\/Alfakit\/Page\.(tsx|vue|svelte)$/
                    const keys = manifest ? Object.keys(JSON.parse(manifest)) : []
                    if (keys.some((key) => entry.test(key))) return 'manifest ok'
                    const rebuild = app.run('npm', ['run', 'build'], { timeout: 900_000 })
                    throw new Error(
                        `public/build/manifest.json ${manifest ? 'has no key matching ' + entry : 'does not exist'} after alfakit:setup` +
                            ` ("Unable to locate file in Vite manifest" for a new user).\nRecovery for the next steps: npm run build → exit ${rebuild.code}`,
                    )
                },
            )

            await cli(
                'A07',
                `The app uses the local tarballs (not @alfakit/${renderer} from the npm registry)`,
                () => {
                    const problems = []
                    for (const pkg of ['@alfakit/core', `@alfakit/${renderer}`]) {
                        const entry = app.npmResolved(pkg)
                        if (!entry?.resolved?.startsWith('file:'))
                            problems.push(`${pkg}: ${JSON.stringify(entry)}`)
                    }
                    const installed = app.read(`node_modules/@alfakit/${renderer}/dist/index.js`)
                    const built = readFileSync(
                        join(REPO, 'packages', renderer, 'dist/index.js'),
                        'utf8',
                    )
                    if (installed !== built)
                        problems.push(
                            `node_modules/@alfakit/${renderer}/dist/index.js differs from the monorepo build`,
                        )
                    if (problems.length === 0)
                        return `${JSON.stringify(app.npmResolved(`@alfakit/${renderer}`))}`
                    app.installTarballs(tarballs)
                    const rebuild = app.run('npm', ['run', 'build'], { timeout: 900_000 })
                    throw new Error(
                        `${problems.join('\n')}\nRecovery: reinstalled the tarballs and rebuilt (exit ${rebuild.code})`,
                    )
                },
                { blocks: 'app' },
            )

            await cli(
                'A08',
                'The notifications table exists (the panel uses database notifications)',
                () => {
                    const provider = app.read('app/Providers/Alfakit/AdminPanelProvider.php') ?? ''
                    if (!provider)
                        throw new Error(
                            'app/Providers/Alfakit/AdminPanelProvider.php was not created',
                        )
                    if (!provider.includes('->databaseNotifications('))
                        skip('the generated provider does not call ->databaseNotifications()')
                    if (
                        !app.php(`Illuminate\\Support\\Facades\\Schema::hasTable('notifications')`)
                    ) {
                        const migrate = app.artisan(['migrate', '--no-interaction'])
                        throw new Error(
                            `No notifications table after alfakit:setup --migrate. Recovery: migrate → exit ${migrate.code}`,
                        )
                    }
                    return 'notifications table present'
                },
            )

            await cli(
                'A09',
                `composer require alfasix/alfakit-translations and ->locales(['en', 'ar'])`,
                () => {
                    mustRun(
                        'composer',
                        ['require', 'alfasix/alfakit-translations:@dev', '--no-interaction'],
                        { cwd: app.dir, timeout: 600_000 },
                    )
                    const file = app.path('app/Providers/Alfakit/AdminPanelProvider.php')
                    const provider = readFileSync(file, 'utf8')
                    if (!provider.includes("->path('admin')"))
                        throw new Error(
                            "The provider has no ->path('admin') to add ->locales() after",
                        )
                    writeFileSync(
                        file,
                        provider.replace(
                            "->path('admin')",
                            "->path('admin')\n            ->locales(['en', 'ar'])",
                        ),
                    )
                },
            )

            // -------------------------------------------------------------- models and generators
            await cli(
                'A10',
                'Models Post / Comment (untyped relationships) / Reply / Note with $fillable, migrate',
                () => {
                    for (const model of ['Post', 'Comment', 'Reply', 'Note'])
                        app.copyFixture(`models/${model}.php`, `app/Models/${model}.php`)
                    app.copyFixture(
                        'migrations/2026_01_01_000001_create_acceptance_tables.php',
                        'database/migrations/2026_01_01_000001_create_acceptance_tables.php',
                    )
                    app.copyFixture(
                        'seeders/AcceptanceSeeder.php',
                        'database/seeders/AcceptanceSeeder.php',
                    )
                    return tail(
                        mustRun('php', ['artisan', 'migrate', '--no-interaction'], { cwd: app.dir })
                            .output,
                        6,
                    )
                },
                { blocks: 'app' },
            )

            const generate = (argv) => {
                const result = app.artisan([...argv, '--no-interaction'])
                if (result.code !== 0)
                    throw new Error(`exit ${result.code}\n${tail(result.output, 30)}`)
                return result.output
            }
            const lint = (file) => {
                if (!existsSync(app.path(file))) throw new Error(`${file} was not generated`)
                const result = run('php', ['-l', app.path(file)])
                if (result.code !== 0)
                    throw new Error(`${file} has a syntax error:\n${result.output}`)
                return readFileSync(app.path(file), 'utf8')
            }

            await cli(
                'A11',
                'php artisan make:alfakit-resource Post --generate --view',
                () => {
                    const output = generate([
                        'make:alfakit-resource',
                        'Post',
                        '--generate',
                        '--view',
                    ])
                    lint('app/Alfakit/Resources/PostResource.php')
                    return tail(output, 12)
                },
                { blocks: 'resources' },
            )

            await cli(
                'A12',
                'php artisan make:alfakit-resource Comment --generate --view --nested=PostResource',
                () => {
                    const output = generate([
                        'make:alfakit-resource',
                        'Comment',
                        '--generate',
                        '--view',
                        '--nested=PostResource',
                    ])
                    const resource = lint('app/Alfakit/Resources/CommentResource.php')
                    const problems = []
                    if (!/\$parentResource\s*=\s*PostResource::class/.test(resource))
                        problems.push(
                            'CommentResource has no $parentResource = PostResource::class',
                        )
                    if (/make\('post_id'\)/.test(resource))
                        problems.push(
                            "CommentResource's form/table still has post_id (the parent key)",
                        )
                    const manager = existsSync(
                        app.path(
                            'app/Alfakit/Resources/PostResource/RelationManagers/CommentsRelationManager.php',
                        ),
                    )
                        ? lint(
                              'app/Alfakit/Resources/PostResource/RelationManagers/CommentsRelationManager.php',
                          )
                        : null
                    if (!manager)
                        problems.push(
                            'PostResource/RelationManagers/CommentsRelationManager.php was not generated (nested resource unreachable)',
                        )
                    else if (!/\$relatedResource\s*=\s*CommentResource::class/.test(manager))
                        problems.push(
                            'CommentsRelationManager does not point at CommentResource ($relatedResource)',
                        )
                    if (
                        !/CommentsRelationManager::class/.test(
                            lint('app/Alfakit/Resources/PostResource.php'),
                        )
                    )
                        problems.push(
                            'PostResource::getRelations() does not register CommentsRelationManager',
                        )
                    if (problems.length)
                        throw new Error(`${problems.join('\n')}\n--- output\n${tail(output, 15)}`)
                    return tail(output, 12)
                },
                { blocks: 'resources' },
            )

            await cli(
                'A13',
                'php artisan make:alfakit-resource Reply --generate --view --nested=CommentResource',
                () => {
                    const output = generate([
                        'make:alfakit-resource',
                        'Reply',
                        '--generate',
                        '--view',
                        '--nested=CommentResource',
                    ])
                    const resource = lint('app/Alfakit/Resources/ReplyResource.php')
                    const problems = []
                    if (!/\$parentResource\s*=\s*CommentResource::class/.test(resource))
                        problems.push(
                            'ReplyResource has no $parentResource = CommentResource::class',
                        )
                    if (/make\('comment_id'\)/.test(resource))
                        problems.push("ReplyResource's form/table still has comment_id")
                    const managerFile =
                        'app/Alfakit/Resources/CommentResource/RelationManagers/RepliesRelationManager.php'
                    if (!existsSync(app.path(managerFile)))
                        problems.push(
                            `${managerFile} was not generated (the untyped Comment::replies() was not found?)`,
                        )
                    else if (
                        !/\$relatedResource\s*=\s*ReplyResource::class/.test(lint(managerFile))
                    )
                        problems.push('RepliesRelationManager does not point at ReplyResource')
                    if (
                        !/RepliesRelationManager::class/.test(
                            lint('app/Alfakit/Resources/CommentResource.php'),
                        )
                    )
                        problems.push(
                            'CommentResource::getRelations() does not register RepliesRelationManager',
                        )
                    if (problems.length)
                        throw new Error(`${problems.join('\n')}\n--- output\n${tail(output, 15)}`)
                    return tail(output, 12)
                },
                { blocks: 'resources' },
            )

            await cli(
                'A14',
                'make:alfakit-resource Note --generate --soft-deletes on a model without SoftDeletes',
                () => {
                    const output = generate([
                        'make:alfakit-resource',
                        'Note',
                        '--generate',
                        '--soft-deletes',
                    ])
                    const resource = lint('app/Alfakit/Resources/NoteResource.php')
                    const problems = []
                    if (
                        /TrashedFilter|RestoreAction|ForceDeleteAction|onlyTrashed|withTrashed/.test(
                            resource,
                        )
                    )
                        problems.push(
                            'NoteResource has trashed / restore code although Note does not use SoftDeletes',
                        )
                    if (!/SoftDeletes/.test(output))
                        problems.push('The generator printed no warning about SoftDeletes')
                    if (problems.length)
                        throw new Error(`${problems.join('\n')}\n--- output\n${tail(output, 15)}`)
                    return tail(output, 6)
                },
            )

            await cli(
                'A15',
                'php artisan make:alfakit-widget BlogStats --type=stats, then the docs example verbatim',
                () => {
                    const output = generate(['make:alfakit-widget', 'BlogStats', '--type=stats'])
                    const file = 'app/Alfakit/Widgets/BlogStats.php'
                    lint(file)
                    writeFileSync(app.path(file), widgetExample(REPO))
                    lint(file)
                    const check = app.php(`(new \\App\\Alfakit\\Widgets\\BlogStats())::class`)
                    return `${tail(output, 4)}\nclass loads: ${check}`
                },
            )

            await cli(
                'A16',
                'php artisan route:list --json (app boots, nested routes registered)',
                () => {
                    const result = mustRun('php', ['artisan', 'route:list', '--json'], {
                        cwd: app.dir,
                    })
                    routes = JSON.parse(result.stdout.slice(result.stdout.indexOf('[')))
                    const uris = routes.map((r) => r.uri)
                    const expected = [
                        'admin/posts/{record}',
                        'admin/posts/{post}/comments/create',
                        'admin/posts/{post}/comments/{comment}/replies/create',
                        'admin/users',
                        'admin/notes',
                    ]
                    const missing = expected.filter((uri) => !uris.includes(uri))
                    if (missing.length)
                        throw new Error(
                            `Missing routes: ${missing.join(', ')}\nAdmin routes: ${uris.filter((u) => u.startsWith('admin')).join(', ')}`,
                        )
                    return `${routes.length} routes, ${uris.filter((u) => u.startsWith('admin')).length} under admin/`
                },
                { blocks: 'app' },
            )

            await cli(
                'A17',
                'Seed posts, comments, replies and a note',
                () => {
                    mustRun(
                        'php',
                        [
                            'artisan',
                            'db:seed',
                            '--class=Database\\Seeders\\AcceptanceSeeder',
                            '--no-interaction',
                        ],
                        { cwd: app.dir },
                    )
                    Object.assign(
                        ids,
                        app.php(`[
          'post' => App\\Models\\Post::where('title', 'Seeded acceptance post')->value('id'),
          'comment' => App\\Models\\Comment::where('body', 'Seeded comment alpha')->value('id'),
          'reply' => App\\Models\\Reply::where('body', 'Seeded reply one')->value('id'),
          'note' => App\\Models\\Note::value('id'),
        ]`),
                    )
                    writeFileSync(
                        app.path('.acceptance.json'),
                        JSON.stringify({ ids, credentials, url: app.url }, null, 2),
                    )
                    return JSON.stringify(ids)
                },
                { blocks: 'app' },
            )

            await cli('A18', 'php artisan alfakit:doctor', () => {
                const result = app.artisan(['alfakit:doctor'])
                writeFileSync(report.artifact('doctor.txt'), result.output)
                if (result.code !== 0)
                    throw new Error(`exit ${result.code}\n${tail(result.output, 40)}`)
                return tail(result.output, 30)
            })

            await cli(
                'A19',
                'No local.ERROR in storage/logs/laravel.log after the commands',
                () => {
                    const errors = app.logErrorsSince(0)
                    logMark = app.logSize()
                    if (errors.length) {
                        writeFileSync(
                            report.artifact('laravel-errors-cli.log'),
                            errors.join('\n\n'),
                        )
                        throw new Error(
                            `${errors.length} error(s):\n${errors.slice(0, 5).join('\n\n')}`,
                        )
                    }
                },
                { needs: [] },
            )
        }

        // -------------------------------------------------------------- the browser
        if (report.blockers.has('app')) {
            await report.step(
                'B00',
                'Browser journeys',
                () => skip(`blocked: ${report.blockers.get('app')}`),
                {},
            )
        } else {
            await app.restart()
            session = await openSession(playwright, { baseURL: app.url, report })
            await runJourneys({ app, report, session, ids, credentials, routes })

            await report.step(
                'C01',
                'Route crawl: every GET route under /admin (signed in) answers < 500',
                async () => {
                    const result = await crawl({ app, session, routes, ids })
                    writeFileSync(
                        report.artifact('crawl.txt'),
                        [
                            '# 5xx',
                            ...result.server,
                            '',
                            '# 4xx',
                            ...result.client,
                            '',
                            '# 2xx/3xx',
                            ...result.ok,
                            '',
                            '# skipped',
                            ...result.skipped,
                        ].join('\n'),
                    )
                    const summary = `${result.ok.length} ok, ${result.client.length} 4xx, ${result.server.length} 5xx, ${result.skipped.length} skipped`
                    if (result.server.length)
                        throw new Error(`${summary}\n${result.server.join('\n')}`)
                    return `${summary}\n4xx:\n${result.client.join('\n') || '(none)'}\nskipped:\n${result.skipped.join('\n') || '(none)'}`
                },
                { needs: ['app', 'auth'] },
            )

            await report.step(
                'L01',
                'No local.ERROR in storage/logs/laravel.log during the browser journeys and crawl',
                () => {
                    const errors = app.logErrorsSince(logMark)
                    if (errors.length) {
                        writeFileSync(
                            report.artifact('laravel-errors-browser.log'),
                            errors.join('\n\n'),
                        )
                        throw new Error(
                            `${errors.length} error(s):\n${errors.slice(0, 8).join('\n\n')}`,
                        )
                    }
                },
            )
        }
    } catch (error) {
        await report.step('X01', 'Harness error', () => {
            throw error
        })
    } finally {
        await session?.close()
        await app.stop()
        report.meta.Finished = new Date().toISOString()
        const path = report.write()
        log(`Report: ${path}`)
        if (keep || reuse) log(`Kept ${app.dir} (${app.url})`)
        else {
            try {
                app.cleanup()
            } catch (error) {
                log(`Cleanup failed: ${error.message}`)
            }
        }
        current = null
    }
    return { renderer, mode, report }
}
