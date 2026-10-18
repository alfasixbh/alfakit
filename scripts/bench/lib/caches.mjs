import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import os from 'node:os'
import { dirname, join } from 'node:path'

const artisan = (dir, ...args) =>
    execFileSync('php', ['artisan', ...args], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] })

/**
 * Laravel's caches for a run, the same for every target: `optimize` runs `php artisan
 * optimize` (config, events, routes and views, plus `alfakit:optimize` or `filament:optimize`
 * through their optimize hooks) before a target is measured, `none` clears them all
 * (`optimize:clear`), `keep` leaves each app as it is. Afterwards every app is put back: the
 * caches are cleared, and the framework's own component cache (bootstrap/cache/alfakit or
 * bootstrap/cache/filament) is rebuilt if it existed before.
 */
export function cacheGuard(root, mode = 'optimize') {
    const restores = []

    const prepare = (target) => {
        if (mode === 'keep' || !target.envFile) return

        const dir = join(root, dirname(target.envFile))
        const framework = target.kind === 'filament' ? 'filament' : 'alfakit'
        const had = existsSync(join(dir, 'bootstrap/cache', framework))

        restores.push(() => {
            artisan(dir, 'optimize:clear')
            if (had) artisan(dir, `${framework}:optimize`)
        })

        artisan(dir, 'optimize:clear')
        if (mode === 'optimize') artisan(dir, 'optimize')
        console.log(
            `${target.name}: Laravel caches ${mode === 'optimize' ? 'built (php artisan optimize)' : 'cleared'}`,
        )
    }

    const restore = () => {
        while (restores.length > 0) {
            try {
                restores.pop()()
            } catch (error) {
                console.error(`cache restore failed: ${error.message}`)
            }
        }
    }

    // Before the .env guard's handlers (which exit), so Ctrl+C also puts the caches back.
    for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(signal, restore)

    return { prepare, restore }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Waits until the one-minute load average is below `max` (checked every 5 s, at most
 * `timeoutMs`), so a run never starts on a busy machine. Returns the load it started at.
 */
export async function waitForIdle(max = 3, timeoutMs = 10 * 60_000) {
    const started = Date.now()
    let announced = false

    while (os.loadavg()[0] >= max && Date.now() - started < timeoutMs) {
        if (!announced) {
            console.log(`waiting for load average < ${max} (now ${os.loadavg()[0].toFixed(2)})`)
            announced = true
        }

        await sleep(5000)
    }

    return os.loadavg()[0]
}
