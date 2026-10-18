/**
 * The machine and software a run measured on, recorded into every results file: CPU model,
 * cores, RAM, OS, PHP, Node and browser versions, and what each target reports about itself.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import os from 'node:os'

const run = (command, args) => {
    try {
        return execFileSync(command, args, {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
            timeout: 5000,
        }).trim()
    } catch {
        return null
    }
}

function operatingSystem() {
    if (process.platform === 'darwin') {
        const name = run('sw_vers', ['-productName'])
        const version = run('sw_vers', ['-productVersion'])
        const build = run('sw_vers', ['-buildVersion'])

        return [name, version, build ? `(${build})` : null].filter(Boolean).join(' ')
    }

    if (process.platform === 'linux') {
        try {
            const release = readFileSync('/etc/os-release', 'utf8')
            const pretty = release.match(/^PRETTY_NAME="?([^"\n]+)"?/m)?.[1]

            if (pretty) return `${pretty} (kernel ${os.release()})`
        } catch {
            // Fall through to the generic description.
        }
    }

    return `${os.type()} ${os.release()}`
}

function cpuModel() {
    const model = os.cpus()[0]?.model?.trim()

    if (process.platform === 'darwin') {
        return run('sysctl', ['-n', 'machdep.cpu.brand_string']) ?? model ?? 'unknown'
    }

    return model ?? 'unknown'
}

function performanceCores() {
    if (process.platform !== 'darwin') return null

    const performance = Number(run('sysctl', ['-n', 'hw.perflevel0.physicalcpu']))
    const efficiency = Number(run('sysctl', ['-n', 'hw.perflevel1.physicalcpu']))

    return Number.isFinite(performance) && performance > 0
        ? { performance, efficiency: Number.isFinite(efficiency) ? efficiency : 0 }
        : null
}

export function hardware() {
    const php = run('php', ['-r', 'echo PHP_VERSION;'])
    const opcache = run('php', ['-r', 'echo (int) ini_get("opcache.enable_cli");'])

    return {
        cpu: cpuModel(),
        cores: os.cpus().length,
        coreTypes: performanceCores(),
        physicalCores:
            process.platform === 'darwin'
                ? Number(run('sysctl', ['-n', 'hw.physicalcpu'])) || null
                : null,
        memoryGb: Math.round((os.totalmem() / 1024 ** 3) * 10) / 10,
        os: operatingSystem(),
        arch: process.arch,
        machine: process.platform === 'darwin' ? run('sysctl', ['-n', 'hw.model']) : null,
        php,
        phpCliOpcache: opcache === null ? null : opcache === '1',
        node: process.version,
        herd: run('herd', ['--version']),
    }
}
