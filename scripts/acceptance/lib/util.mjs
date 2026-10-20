// Small process, file and logging helpers for the acceptance harness.
import { spawn, spawnSync } from 'node:child_process'
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'

let logFile = null

/** Every command and its output also goes to this file (the run's full log). */
export function setLogFile(path) {
    logFile = path
    writeFileSync(path, '')
}

export function log(message) {
    const line = `[${new Date().toISOString().slice(11, 19)}] ${message}`
    console.log(line)
    if (logFile) appendFileSync(logFile, `${line}\n`)
}

function logOutput(text) {
    if (logFile && text) appendFileSync(logFile, text.endsWith('\n') ? text : `${text}\n`)
}

/**
 * Runs a command synchronously and captures its output. Never throws on a non-zero exit;
 * callers decide (see `mustRun`). Output is written to the run log, not the console.
 */
export function run(command, args, { cwd, env, timeout = 600_000, input } = {}) {
    const printable = [command, ...args]
        .map((a) => (/[\s"'$]/.test(a) ? JSON.stringify(a) : a))
        .join(' ')
    log(`$ ${printable}${cwd ? `   (in ${cwd})` : ''}`)
    const result = spawnSync(command, args, {
        cwd,
        env: { ...process.env, ...env },
        timeout,
        input,
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
    })
    const stdout = result.stdout ?? ''
    const stderr = result.stderr ?? ''
    logOutput(stdout)
    logOutput(stderr)
    const code = result.status ?? (result.error ? 1 : 0)
    if (result.error) logOutput(`(spawn error: ${result.error.message})`)
    return { code, stdout, stderr, output: `${stdout}${stderr}`, printable, error: result.error }
}

export function mustRun(command, args, options) {
    const result = run(command, args, options)
    if (result.code !== 0) {
        throw new Error(
            `\`${result.printable}\` exited with ${result.code}:\n${tail(result.output, 40)}`,
        )
    }
    return result
}

/** Starts a long-running process (php artisan serve); the caller must kill it. */
export function startProcess(command, args, { cwd, env } = {}) {
    log(`$ ${command} ${args.join(' ')} &   (in ${cwd})`)
    const child = spawn(command, args, {
        cwd,
        env: { ...process.env, ...env },
        stdio: ['ignore', 'pipe', 'pipe'],
    })
    child.stdout.on('data', (chunk) => logOutput(chunk.toString()))
    child.stderr.on('data', (chunk) => logOutput(chunk.toString()))
    return child
}

export function tail(text, lines = 30) {
    return String(text ?? '')
        .trimEnd()
        .split('\n')
        .slice(-lines)
        .join('\n')
}

export function readJson(path) {
    return JSON.parse(readFileSync(path, 'utf8'))
}

export function writeJson(path, data) {
    writeFileSync(path, `${JSON.stringify(data, null, 4)}\n`)
}

export function readIfExists(path) {
    return existsSync(path) ? readFileSync(path, 'utf8') : null
}

export function freePort() {
    return new Promise((resolve, reject) => {
        const server = createServer()
        server.unref()
        server.on('error', reject)
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address()
            server.close(() => resolve(port))
        })
    })
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export function shortId() {
    return Math.random().toString(36).slice(2, 7)
}

/** Sets (or adds) KEY=value lines in a dotenv file. */
export function setEnv(path, values) {
    let contents = readFileSync(path, 'utf8')
    for (const [key, value] of Object.entries(values)) {
        const line = `${key}=${value}`
        const pattern = new RegExp(`^#?\\s*${key}=.*$`, 'm')
        contents = pattern.test(contents)
            ? contents.replace(pattern, line)
            : `${contents.trimEnd()}\n${line}\n`
    }
    writeFileSync(path, contents)
}
