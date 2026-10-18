import {
  checkSchemaContract,
  reportSchemaContractMismatch,
  type PanelSchema,
  type SchemaContractCheck,
} from '@alfakit/core'
import { useEffect, type ReactNode } from 'react'
import { useT } from '../../context'

/**
 * Renders its children only when the page's schema contract (`alfakit.schemaContract`) has
 * the major version this frontend understands; otherwise a translated message replaces the
 * page and the mismatch is logged once, naming both versions.
 */
export function SchemaContractGuard({
  panel,
  children,
}: {
  panel: PanelSchema | undefined
  children: ReactNode
}) {
  const check = checkSchemaContract(panel?.schemaContract)

  useEffect(() => {
    reportSchemaContractMismatch(check)
  }, [check.compatible, check.server, check.client]) // eslint-disable-line react-hooks/exhaustive-deps

  if (check.compatible) {
    return <>{children}</>
  }

  return <SchemaContractMismatch check={check} />
}

export function SchemaContractMismatch({ check }: { check: SchemaContractCheck }) {
  const t = useT()

  return (
    <div
      role="alert"
      data-slot="schema-contract-mismatch"
      className="bg-background text-foreground mx-auto flex min-h-svh w-full max-w-lg flex-col items-center justify-center gap-2 p-6 text-center"
    >
      <h1 className="text-lg font-semibold">{t('schema_contract.title')}</h1>
      <p className="text-muted-foreground text-sm">
        {t('schema_contract.body', { server: check.server ?? '?', client: check.client })}
      </p>
    </div>
  )
}
