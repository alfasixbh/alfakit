import type { ChartFiltersFormSchema } from '@alfakit/core'
import { FormStore, chartFiltersUrl, resolvePartialProps, triggerButtonView } from '@alfakit/core'
import { router } from '@inertiajs/react'
import { FilterIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useT } from '../../context'
import { useStore } from '../../hooks/use-store'
import { Icon } from '../../lib/icons'
import { FormProvider } from '../form/form-context'
import { SchemaRenderer } from '../schema/schema-renderer'
import { TableTriggerButton } from '../table/trigger-button'
import { Button } from '../ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'

/**
 * The `filtersSchema()` form of a chart widget, in a popover. Values live in the query
 * string; the chart reloads on every change, or on "Apply" with deferred filters.
 */
export function ChartFilters({
  form,
  widgetId,
}: {
  form: ChartFiltersFormSchema
  widgetId: string
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  // A fresh store per server state: the filters the chart was drawn with.
  const store = useMemo(
    () => new FormStore(form, { token: '', component: `chartFilters:${widgetId}` }),
    [form, widgetId],
  )
  const state = useStore(store.store)
  const applied = useRef(JSON.stringify(form.state))

  useEffect(() => () => store.destroy(), [store])

  const apply = (values: Record<string, unknown> | null) => {
    if (typeof window === 'undefined') return

    applied.current = JSON.stringify(values ?? {})
    router.visit(chartFiltersUrl(window.location.href, form.queryKey, widgetId, values), {
      only: resolvePartialProps(['page']),
      preserveScroll: true,
      preserveState: true,
      replace: true,
    })
  }

  // Live filters apply as the user changes them.
  useEffect(() => {
    if (form.deferred) return

    const values = JSON.stringify(state.values)

    if (values !== applied.current) apply(state.values)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.values, form.deferred])

  // `filtersResetAction()` / `filtersApplyAction()` restyle the buttons.
  const resetView = triggerButtonView(form, 'filtersReset', {
    label: t('table.reset_filters', {}, 'Reset'),
    variant: 'ghost',
  })
  const applyView = triggerButtonView(form, 'filtersApply', {
    label: t('table_filters.apply', {}, 'Apply'),
    variant: 'default',
  })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t('table.filters', {}, 'Filters')}
          data-slot="chart-filters-trigger"
        >
          <Icon name="alfakit::widgets.chart.filter" fallback={FilterIcon} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-80 flex-col gap-4" data-slot="chart-filters">
        <FormProvider store={store}>
          <SchemaRenderer components={state.components} columns={state.columns} />
        </FormProvider>
        <div className="flex items-center justify-between gap-2">
          {resetView ? (
            <TableTriggerButton
              view={resetView}
              data-slot="chart-filters-reset"
              onClick={() => {
                apply(null)
                setOpen(false)
              }}
            />
          ) : (
            <span />
          )}
          {form.deferred && applyView && (
            <TableTriggerButton
              view={applyView}
              data-slot="chart-filters-apply"
              onClick={() => {
                apply(state.values)
                setOpen(false)
              }}
            />
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
