import { SCHEMA_CONTRACT_VERSION, Translator, resetSchemaContractReports } from '@alfakit/core'
import { h } from 'vue'
import SchemaContractGuard from '../src/components/panel/SchemaContractGuard.vue'
import { ALFAKIT_KEY } from '../src/context'
import { actions, mountWithAlfakit, panel, registry } from './mocks'

const translator = new Translator({
  schema_contract: {
    title: 'Cannot display this page',
    body: 'Server sends :server, frontend understands :client.',
  },
})

function mountGuard(schemaContract: string | undefined) {
  return mountWithAlfakit(
    () =>
      h(SchemaContractGuard, { panel: { ...panel, schemaContract } }, () => h('p', 'Page content')),
    {
      global: {
        provide: { [ALFAKIT_KEY as symbol]: { registry, pages: {}, actions, translator } },
      },
    },
  )
}

describe('SchemaContractGuard', () => {
  afterEach(() => {
    resetSchemaContractReports()
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('renders the page when the contract majors match or the server sends none', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    const matching = mountGuard(SCHEMA_CONTRACT_VERSION)
    expect(matching.text()).toContain('Page content')
    expect(matching.find('[role="alert"]').exists()).toBe(false)
    matching.unmount()

    const missing = mountGuard(undefined)
    expect(missing.text()).toContain('Page content')
    missing.unmount()

    expect(error).not.toHaveBeenCalled()
  })

  it('replaces the page with a translated message and logs both versions on a mismatch', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    const wrapper = mountGuard('99.0')

    expect(wrapper.text()).not.toContain('Page content')
    const alert = wrapper.find('[role="alert"]')
    expect(alert.attributes('data-slot')).toBe('schema-contract-mismatch')
    expect(alert.text()).toContain('Cannot display this page')
    expect(alert.text()).toContain(
      `Server sends 99.0, frontend understands ${SCHEMA_CONTRACT_VERSION}.`,
    )
    expect(error).toHaveBeenCalledTimes(1)
    expect(String(error.mock.calls[0]![0])).toContain('schema contract 99.0')
    wrapper.unmount()
  })
})
