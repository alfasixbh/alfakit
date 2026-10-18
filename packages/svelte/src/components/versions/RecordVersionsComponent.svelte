<script lang="ts">
  import type { RecordVersionsSchema } from '@alfakit/core'
  import ArrowRightIcon from '@lucide/svelte/icons/arrow-right'
  import { useActionRunner, useFormatter, usePageSchema, useT } from '../../context.svelte'
  import { useHydrated } from '../../hooks/hydrated.svelte'
  import Icon from '../../lib/Icon.svelte'
  import { Badge } from '../ui/badge'
  import { Button } from '../ui/button'

  /**
   * The History slide-over's version list (`HistoryAction`): each version with its event,
   * author and time, the changed fields (old → new, long and rich text as a word diff) and
   * "Restore this version", which runs the nested restore action.
   */
  let { component }: { component: RecordVersionsSchema } = $props()

  const t = useT()
  const runner = useActionRunner()
  const page = $derived(usePageSchema())
  const formatter = useFormatter()
  // Times follow the panel's timezone; formatted after hydration so server and client agree.
  const hydrated = useHydrated()
  const restoreAction = $derived(component.restoreAction)

  const time = (createdAt?: string) =>
    createdAt && hydrated.current ? formatter.current.dateTime(createdAt) : ''

  const restore = (id: number) => {
    if (!restoreAction) return

    void runner.trigger(restoreAction, {
      token: page?.token ?? '',
      component: component.actionComponent ?? 'page',
      parents: component.actionPath ?? [],
      arguments: { version: id },
    })
  }
</script>

{#if component.versions.length === 0}
  <p data-slot="record-versions" class="text-muted-foreground text-sm">{component.emptyLabel}</p>
{:else}
  <ol
    data-slot="record-versions"
    aria-label={t('versions.list', {}, 'Versions')}
    class="flex flex-col gap-3"
  >
    {#each component.versions as version (version.id)}
      <li
        data-slot="record-version"
        data-event={version.event}
        class="bg-card rounded-lg border p-3"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex min-w-0 flex-col gap-0.5">
            <span class="flex flex-wrap items-center gap-2 text-sm font-medium">
              {version.eventLabel}
              {#if version.current}<Badge variant="secondary"
                  >{t('versions.current', {}, 'Current')}</Badge
                >{/if}
            </span>
            <span class="text-muted-foreground text-xs"
              >{version.author
                ? t(
                    'versions.by',
                    { author: version.author, time: time(version.createdAt) },
                    `${version.author} · ${time(version.createdAt)}`,
                  )
                : time(version.createdAt)}</span
            >
          </div>
          {#if restoreAction && !version.current}
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="shrink-0"
              aria-label={t(
                'versions.restore_label',
                { time: time(version.createdAt) },
                `Restore the version of ${time(version.createdAt)}`,
              )}
              onclick={() => restore(version.id)}
            >
              {#if restoreAction.icon}<Icon name={restoreAction.icon} class="size-3.5" />{/if}
              {restoreAction.label}
            </Button>
          {/if}
        </div>
        {#if version.changes.length > 0}
          <dl class="mt-3 flex flex-col gap-2 text-sm">
            {#each version.changes as change (change.attribute)}
              <div data-slot="record-version-change" data-attribute={change.attribute}>
                <dt class="text-muted-foreground text-xs font-medium">{change.label}</dt>
                <dd class="mt-0.5 break-words">
                  {#if change.diff}
                    <p data-slot="record-version-diff" class="whitespace-pre-wrap">
                      {#each change.diff as part, index (index)}{#if part.type === 'insert'}<ins
                            class="rounded-sm bg-emerald-500/15 text-emerald-700 no-underline dark:text-emerald-300"
                            ><span class="sr-only">{`${t('versions.added', {}, 'Added:')} `}</span
                            >{part.text}</ins
                          >{:else if part.type === 'delete'}<del
                            class="bg-destructive/10 text-destructive rounded-sm"
                            ><span class="sr-only"
                              >{`${t('versions.removed', {}, 'Removed:')} `}</span
                            >{part.text}</del
                          >{:else}<span>{part.text}</span>{/if}{/each}
                    </p>
                  {:else}
                    <p class="flex flex-wrap items-center gap-1.5">
                      <del class="text-muted-foreground"
                        ><span class="sr-only">{`${t('versions.old_value', {}, 'Before:')} `}</span
                        >{change.old ?? t('versions.empty_value', {}, 'Empty')}</del
                      >
                      <ArrowRightIcon
                        class="text-muted-foreground size-3.5 shrink-0 rtl:rotate-180"
                        aria-hidden="true"
                      />
                      <ins class="no-underline"
                        ><span class="sr-only">{`${t('versions.new_value', {}, 'After:')} `}</span
                        >{change.new ?? t('versions.empty_value', {}, 'Empty')}</ins
                      >
                    </p>
                  {/if}
                </dd>
              </div>
            {/each}
          </dl>
        {:else}
          <p class="text-muted-foreground mt-2 text-xs">
            {t('versions.no_changes', {}, 'No tracked fields changed.')}
          </p>
        {/if}
      </li>
    {/each}
  </ol>
{/if}
