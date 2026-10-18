import { SCHEMA_CONTRACT_VERSION, Translator, resetSchemaContractReports } from '@alfakit/core'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { SchemaContractGuard } from '../src/components/panel/schema-contract-guard'
import { AlfakitProvider } from '../src/context'
import { actions, panel, registry } from './mocks'

function Translated({ children }: { children: ReactNode }) {
  const translator = new Translator({
    schema_contract: {
      title: 'Cannot display this page',
      body: 'Server sends :server, frontend understands :client.',
    },
  })

  return (
    <AlfakitProvider value={{ registry, pages: {}, actions, translator }}>
      {children}
    </AlfakitProvider>
  )
}

describe('SchemaContractGuard', () => {
  afterEach(() => {
    resetSchemaContractReports()
    vi.restoreAllMocks()
  })

  it('renders the page when the contract majors match', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <Translated>
        <SchemaContractGuard panel={{ ...panel, schemaContract: SCHEMA_CONTRACT_VERSION }}>
          <p>Page content</p>
        </SchemaContractGuard>
      </Translated>,
    )

    expect(screen.getByText('Page content')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(error).not.toHaveBeenCalled()
  })

  it('renders the page when the server sends no contract version', () => {
    render(
      <Translated>
        <SchemaContractGuard panel={panel}>
          <p>Page content</p>
        </SchemaContractGuard>
      </Translated>,
    )

    expect(screen.getByText('Page content')).toBeInTheDocument()
  })

  it('replaces the page with a translated message and logs both versions on a mismatch', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <Translated>
        <SchemaContractGuard panel={{ ...panel, schemaContract: '99.0' }}>
          <p>Page content</p>
        </SchemaContractGuard>
      </Translated>,
    )

    expect(screen.queryByText('Page content')).toBeNull()
    const alert = screen.getByRole('alert')
    expect(alert).toHaveAttribute('data-slot', 'schema-contract-mismatch')
    expect(alert).toHaveTextContent('Cannot display this page')
    expect(alert).toHaveTextContent(
      `Server sends 99.0, frontend understands ${SCHEMA_CONTRACT_VERSION}.`,
    )
    expect(error).toHaveBeenCalledTimes(1)
    expect(String(error.mock.calls[0]![0])).toContain('schema contract 99.0')
    expect(String(error.mock.calls[0]![0])).toContain(`contract ${SCHEMA_CONTRACT_VERSION}`)
  })
})
