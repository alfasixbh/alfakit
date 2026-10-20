// Creating, configuring, serving and removing the fresh Laravel app under test.
import {
    copyFileSync,
    existsSync,
    lstatSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    rmSync,
    unlinkSync,
    writeFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import {
    freePort,
    log,
    mustRun,
    readIfExists,
    readJson,
    run,
    setEnv,
    sleep,
    startProcess,
} from './util.mjs'

/** Kills `php artisan serve` and the `php -S` it starts (one process group). */
function killGroup(child) {
    try {
        process.kill(-child.pid, 'SIGTERM')
    } catch {
        child.kill('SIGTERM')
    }
}

export const HERD_SITES = join(homedir(), 'Library/Application Support/Herd/config/valet/Sites')
export const APP_PREFIX = 'alfakit-acc-'

/** Builds @alfakit/core and the renderers, and packs each into `outDir`. */
export function buildTarballs(repo, renderers, outDir) {
    mkdirSync(outDir, { recursive: true })
    const tarballs = {}
    for (const name of ['core', ...renderers]) {
        mustRun('pnpm', ['--filter', `@alfakit/${name}`, 'build'], { cwd: repo, timeout: 900_000 })
        const before = new Set(readdirSync(outDir))
        mustRun('pnpm', ['pack', '--pack-destination', outDir], {
            cwd: join(repo, 'packages', name),
        })
        const created = readdirSync(outDir).find(
            (file) => !before.has(file) && file.startsWith(`alfakit-${name}-`),
        )
        const file =
            created ??
            readdirSync(outDir).find((f) => f.startsWith(`alfakit-${name}-`) && f.endsWith('.tgz'))
        if (!file) throw new Error(`pnpm pack produced no tarball for @alfakit/${name}`)
        tarballs[name] = join(outDir, file)
    }
    return tarballs
}

export class App {
    constructor({ repo, renderer, mode, parentDir, name, serve }) {
        this.repo = repo
        this.renderer = renderer
        this.mode = mode
        this.name = name
        this.parentDir = parentDir
        this.dir = join(parentDir, name)
        this.serve = serve
        this.server = null
        this.url = serve ? null : `http://${name}.localhost`
        this.linked = false
    }

    run(command, args, options = {}) {
        return run(command, args, { cwd: this.dir, ...options })
    }

    artisan(args, options = {}) {
        return this.run('php', ['artisan', ...args], options)
    }

    /** Evaluates a PHP expression in the app and returns its JSON-decoded value. */
    php(expression) {
        const result = this.artisan([
            'tinker',
            `--execute=echo '@@ACC@@'.json_encode(${expression});`,
        ])
        const line = result.output.split('\n').find((l) => l.includes('@@ACC@@'))
        if (!line)
            throw new Error(
                `tinker returned no value for ${expression}:\n${result.output.slice(-2000)}`,
            )
        return JSON.parse(line.slice(line.indexOf('@@ACC@@') + 7))
    }

    path(...parts) {
        return join(this.dir, ...parts)
    }

    read(file) {
        return readIfExists(this.path(file))
    }

    copyFixture(fixture, target) {
        const destination = this.path(target)
        mkdirSync(dirname(destination), { recursive: true })
        copyFileSync(join(this.repo, 'scripts/acceptance/fixtures', fixture), destination)
    }

    create() {
        if (existsSync(this.dir)) throw new Error(`${this.dir} already exists`)
        // --no-boost: the installer would otherwise ask about Laravel Boost.
        return mustRun(
            'laravel',
            [
                'new',
                this.name,
                `--${this.renderer}`,
                '--database=sqlite',
                '--pest',
                '--npm',
                '--no-boost',
                '--no-interaction',
            ],
            { cwd: this.parentDir, timeout: 1_200_000, env: { COMPOSER_NO_INTERACTION: '1' } },
        )
    }

    async start() {
        if (this.serve) {
            const port = await freePort()
            this.url = `http://127.0.0.1:${port}`
            this.configureEnv()
            this.server = startProcess(
                'php',
                ['artisan', 'serve', '--host=127.0.0.1', `--port=${port}`, '--no-reload'],
                {
                    cwd: this.dir,
                    env: {},
                },
            )
        } else {
            // No name argument: `herd link <name>` would link the wrong directory name.
            mustRun('herd', ['link'], { cwd: this.dir })
            this.linked = true
            this.configureEnv()
        }
    }

    configureEnv() {
        setEnv(this.path('.env'), {
            APP_URL: this.url,
            INERTIA_SSR_ENABLED: 'false',
            QUEUE_CONNECTION: 'sync',
            MAIL_MAILER: 'log',
        })
    }

    /** Restarts `php artisan serve` (it caches nothing, but .env changes need a new process). */
    async restart() {
        if (!this.server) return
        killGroup(this.server)
        await sleep(500)
        const port = new URL(this.url).port
        this.server = startProcess(
            'php',
            ['artisan', 'serve', '--host=127.0.0.1', `--port=${port}`, '--no-reload'],
            {
                cwd: this.dir,
                env: {},
            },
        )
    }

    /** Waits until the site answers (Herd link or the dev server starting). */
    async waitUntilUp(request) {
        const deadline = Date.now() + 90_000
        let last = ''
        while (Date.now() < deadline) {
            try {
                const response = await request.get(`${this.url}/up`, {
                    timeout: 10_000,
                    failOnStatusCode: false,
                })
                if (response.status() < 500) return response.status()
                last = `HTTP ${response.status()}`
            } catch (error) {
                last = error.message.split('\n')[0]
            }
            await sleep(1_000)
        }
        throw new Error(`${this.url} did not come up within 90s (${last})`)
    }

    installPhpPackage(version) {
        // The app is a snapshot of the monorepo (symlink: false). `versions` gives the copied
        // packages a version so `alfasix/alfakit-translations` (`alfasix/alfakit: *`) resolves.
        const repository = (name, path) =>
            JSON.stringify({
                type: 'path',
                url: join(this.repo, path),
                options: { symlink: false, versions: { [name]: version } },
            })
        mustRun('composer', ['config', 'minimum-stability', 'dev'], { cwd: this.dir })
        mustRun('composer', ['config', 'prefer-stable', 'true'], { cwd: this.dir })
        mustRun(
            'composer',
            ['config', 'repositories.alfakit', repository('alfasix/alfakit', 'packages/alfakit')],
            { cwd: this.dir },
        )
        mustRun(
            'composer',
            [
                'config',
                'repositories.alfakit-translations',
                repository('alfasix/alfakit-translations', 'packages/translations'),
            ],
            { cwd: this.dir },
        )
        return mustRun('composer', ['require', 'alfasix/alfakit:@dev', '--no-interaction'], {
            cwd: this.dir,
            timeout: 900_000,
        })
    }

    /** Which source Composer installed a package from (`path` for the monorepo snapshot). */
    composerSource(name) {
        const installed = readJson(this.path('vendor/composer/installed.json'))
        const entry = (installed.packages ?? installed).find((p) => p.name === name)
        return entry
            ? { version: entry.version, dist: entry.dist?.type, url: entry.dist?.url }
            : null
    }

    installTarballs(tarballs) {
        const local = this.path('.acceptance-tarballs')
        mkdirSync(local, { recursive: true })
        const specs = []
        for (const name of ['core', this.renderer]) {
            const target = join(local, basename(tarballs[name]))
            copyFileSync(tarballs[name], target)
            specs.push(`./.acceptance-tarballs/${basename(target)}`)
        }
        return mustRun('npm', ['install', ...specs, '--no-audit', '--no-fund'], {
            cwd: this.dir,
            timeout: 900_000,
        })
    }

    /** `resolved` of an installed npm package (file:… for a tarball). */
    npmResolved(name) {
        const lock = readIfExists(this.path('package-lock.json'))
        if (!lock) return null
        const entry = JSON.parse(lock).packages?.[`node_modules/${name}`]
        return entry ? { version: entry.version, resolved: entry.resolved ?? null } : null
    }

    appendToGitignore() {
        // Keep the tarballs out of a later `git init` of the app.
        const file = this.path('.gitignore')
        const contents = readIfExists(file) ?? ''
        if (!contents.includes('.acceptance-tarballs'))
            writeFileSync(file, `${contents.trimEnd()}\n/.acceptance-tarballs\n`)
    }

    logSize() {
        const file = this.path('storage/logs/laravel.log')
        return existsSync(file) ? readFileSync(file).length : 0
    }

    /** `local.ERROR` entries written since byte `offset`, with their first lines. */
    logErrorsSince(offset) {
        const file = this.path('storage/logs/laravel.log')
        if (!existsSync(file)) return []
        const text = readFileSync(file).subarray(offset).toString('utf8')
        const entries = text.split(/\n(?=\[\d{4}-\d\d-\d\d[ T]\d\d:\d\d:\d\d)/)
        return entries
            .filter((entry) => /^\[[^\]]+\]\s+\w+\.ERROR:/.test(entry))
            .map((entry) => entry.split('\n').slice(0, 6).join('\n'))
    }

    async stop() {
        if (this.server) {
            killGroup(this.server)
            this.server = null
        }
    }

    /** Unlinks from Herd and deletes the app (only ever a directory named alfakit-acc-*). */
    cleanup() {
        if (!basename(this.dir).startsWith(APP_PREFIX))
            throw new Error(`Refusing to delete ${this.dir}`)
        if (this.linked && existsSync(this.dir)) run('herd', ['unlink'], { cwd: this.dir })
        const site = join(HERD_SITES, this.name)
        try {
            if (lstatSync(site).isSymbolicLink()) unlinkSync(site)
        } catch {
            // not linked
        }
        if (existsSync(this.dir)) {
            log(`rm -rf ${this.dir}`)
            rmSync(this.dir, { recursive: true, force: true })
        }
    }
}
