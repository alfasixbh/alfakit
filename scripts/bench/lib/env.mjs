import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Sets APP_DEBUG=false (and, for AlfaKit targets, Inertia's devtools off) in each target's
 * .env for the run, so no target pays for debug tooling, and restores the files afterwards,
 * also on Ctrl+C. `keepDebug` leaves the files alone. `ssr: false` also turns Inertia's SSR
 * off for AlfaKit targets (unless the .env already decides): a server-only benchmark runs no
 * SSR server, and Inertia would otherwise try to reach one on every page load.
 */
export function debugOffGuard(root, { keepDebug = false, ssr = true } = {}) {
    const restores = []

    const restore = () => {
        while (restores.length > 0) {
            const { file, contents } = restores.pop()
            writeFileSync(file, contents)
            console.log(`Restored ${file}`)
        }
    }

    for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
        process.on(signal, () => {
            restore()
            process.exit(130)
        })
    }

    const disable = (target) => {
        const file = join(root, target.envFile)

        if (keepDebug || !target.envFile || !existsSync(file)) return

        const contents = readFileSync(file, 'utf8')
        let next = contents.replace(/^APP_DEBUG=true$/m, 'APP_DEBUG=false')

        // Inertia v3's devtools record every request (props, source lines, timings) in the
        // `local` environment whatever APP_DEBUG says; production apps never run them. Off for
        // the run, like the debug panel, unless the .env already decides.
        if (target.kind === 'alfakit' && !/^INERTIA_DEVTOOLS_ENABLED=/m.test(next)) {
            next = `${next.replace(/\n?$/, '\n')}INERTIA_DEVTOOLS_ENABLED=false\n`
        }

        if (target.kind === 'alfakit' && !ssr && !/^INERTIA_SSR_ENABLED=/m.test(next)) {
            next = `${next.replace(/\n?$/, '\n')}INERTIA_SSR_ENABLED=false\n`
        }

        if (next === contents) return

        restores.push({ file, contents })
        writeFileSync(file, next)
        console.log(
            `APP_DEBUG=false, Inertia devtools${ssr ? '' : ' and SSR'} off in ${target.envFile} for the run`,
        )
    }

    return { disable, restore }
}
