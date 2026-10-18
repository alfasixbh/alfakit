/**
 * The version of the schema contract this frontend understands: the JSON shape the PHP
 * package serialises with `toSchema()`. It mirrors `SchemaContract::VERSION` in PHP, which
 * every page shares as `alfakit.schemaContract`.
 *
 * The major part changes only with a breaking change to the contract; the minor part when
 * props are added. Renderers compare majors and show a message instead of broken UI.
 */
export const SCHEMA_CONTRACT_VERSION = '1.0'

export interface SchemaContractCheck {
  /** False only when both versions are known and their majors differ. */
  compatible: boolean
  /** The version the server sent, or null when the page carries none. */
  server: string | null
  /** The version this frontend was built for. */
  client: string
}

/** The major part of a version (`1.4` → 1, `v2.0.1` → 2), or null when it has none. */
export function schemaContractMajor(version: string | null | undefined): number | null {
  const match = /^v?(\d+)(?:\.|$)/.exec((version ?? '').trim())

  return match ? Number(match[1]) : null
}

/**
 * Compare the contract version a page carries with the one this frontend was built for.
 * Unknown versions (an older server that sends none, a dev build) count as compatible so a
 * missing prop never blanks the panel.
 */
export function checkSchemaContract(
  server: string | null | undefined,
  client: string = SCHEMA_CONTRACT_VERSION,
): SchemaContractCheck {
  const serverMajor = schemaContractMajor(server)
  const clientMajor = schemaContractMajor(client)
  const compatible = serverMajor === null || clientMajor === null || serverMajor === clientMajor

  return { compatible, server: server ?? null, client }
}

const reported = new Set<string>()

/** The console error for a mismatch, naming both versions. */
export function schemaContractMismatchMessage(check: SchemaContractCheck): string {
  return (
    `Alfakit: the server sends schema contract ${check.server ?? 'unknown'} but this frontend ` +
    `(@alfakit/core) was built for contract ${check.client}. Update alfasix/alfakit and the ` +
    '@alfakit packages to the same major version, then rebuild the frontend.'
  )
}

/**
 * Log a mismatch once per server version (per process), so a renderer can call it on every
 * render without flooding the console. Returns true when something was logged.
 */
export function reportSchemaContractMismatch(check: SchemaContractCheck): boolean {
  if (check.compatible) return false

  const key = `${check.server ?? ''}|${check.client}`

  if (reported.has(key)) return false

  reported.add(key)
  console.error(schemaContractMismatchMessage(check))

  return true
}

/** Forget which mismatches were reported (tests). */
export function resetSchemaContractReports(): void {
  reported.clear()
}
