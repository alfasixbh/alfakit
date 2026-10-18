import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  SCHEMA_CONTRACT_VERSION,
  checkSchemaContract,
  reportSchemaContractMismatch,
  resetSchemaContractReports,
  schemaContractMajor,
  schemaContractMismatchMessage,
} from '../src'

describe('schema contract', () => {
  afterEach(() => {
    resetSchemaContractReports()
    vi.restoreAllMocks()
  })

  it('has a major.minor version', () => {
    expect(SCHEMA_CONTRACT_VERSION).toMatch(/^\d+\.\d+$/)
  })

  it('extracts the major part', () => {
    expect(schemaContractMajor('1.0')).toBe(1)
    expect(schemaContractMajor('v2.3.1')).toBe(2)
    expect(schemaContractMajor('12')).toBe(12)
    expect(schemaContractMajor('dev-main')).toBeNull()
    expect(schemaContractMajor(undefined)).toBeNull()
    expect(schemaContractMajor('')).toBeNull()
  })

  it('is compatible within a major and incompatible across majors', () => {
    expect(checkSchemaContract('1.7', '1.0').compatible).toBe(true)
    expect(checkSchemaContract('1.0', '1.9').compatible).toBe(true)
    expect(checkSchemaContract('2.0', '1.9')).toEqual({
      compatible: false,
      server: '2.0',
      client: '1.9',
    })
    expect(checkSchemaContract('1.0', '2.0').compatible).toBe(false)
  })

  it('treats unknown versions as compatible', () => {
    expect(checkSchemaContract(undefined)).toEqual({
      compatible: true,
      server: null,
      client: SCHEMA_CONTRACT_VERSION,
    })
    expect(checkSchemaContract(null).compatible).toBe(true)
    expect(checkSchemaContract('dev-main').compatible).toBe(true)
    expect(checkSchemaContract(SCHEMA_CONTRACT_VERSION).compatible).toBe(true)
  })

  it('logs a mismatch once per server version, naming both versions', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const check = checkSchemaContract('2.0', '1.0')

    expect(reportSchemaContractMismatch(check)).toBe(true)
    expect(reportSchemaContractMismatch(check)).toBe(false)
    expect(reportSchemaContractMismatch(checkSchemaContract('3.0', '1.0'))).toBe(true)
    expect(reportSchemaContractMismatch(checkSchemaContract('1.0', '1.0'))).toBe(false)

    expect(error).toHaveBeenCalledTimes(2)
    expect(error.mock.calls[0]![0]).toBe(schemaContractMismatchMessage(check))
    expect(error.mock.calls[0]![0]).toContain('schema contract 2.0')
    expect(error.mock.calls[0]![0]).toContain('contract 1.0')
  })
})
