import { SCHEMA_CONTRACT_VERSION, resetSchemaContractReports } from '@alfakit/core'
import { render } from '@testing-library/svelte'
import SchemaContractGuard from '../src/components/panel/SchemaContractGuard.svelte'
import { context, panel } from './mocks'
import Wrapper from './Wrapper.svelte'

function renderGuard(schemaContract: string | undefined) {
  return render(Wrapper, {
    props: { component: SchemaContractGuard, props: { panel: { ...panel, schemaContract } } },
  })
}

describe('SchemaContractGuard', () => {
  beforeEach(() => {
    context.translator.setTranslations({
      schema_contract: {
        title: 'Cannot display this page',
        body: 'Server sends :server, frontend understands :client.',
      },
    })
  })

  afterEach(() => {
    context.translator.setTranslations(panel.translations)
    resetSchemaContractReports()
    vi.restoreAllMocks()
  })

  it('renders nothing of its own when the contract majors match or the server sends none', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    const matching = renderGuard(SCHEMA_CONTRACT_VERSION)
    expect(matching.container.querySelector('[role="alert"]')).toBeNull()
    matching.unmount()

    const missing = renderGuard(undefined)
    expect(missing.container.querySelector('[role="alert"]')).toBeNull()
    missing.unmount()

    expect(error).not.toHaveBeenCalled()
  })

  it('shows a translated message and logs both versions on a mismatch', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { container } = renderGuard('99.0')

    const alert = container.querySelector('[role="alert"]')!
    expect(alert).toHaveAttribute('data-slot', 'schema-contract-mismatch')
    expect(alert).toHaveTextContent('Cannot display this page')
    expect(alert).toHaveTextContent(
      `Server sends 99.0, frontend understands ${SCHEMA_CONTRACT_VERSION}.`,
    )
    expect(error).toHaveBeenCalledTimes(1)
    expect(String(error.mock.calls[0]![0])).toContain('schema contract 99.0')
  })
})
