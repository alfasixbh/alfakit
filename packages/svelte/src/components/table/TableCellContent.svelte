<script lang="ts">
  import type { IconColumnSchema } from '@alfakit/core'
  import { columnRegistryKey } from '@alfakit/core'
  import { useRegistry, useT } from '../../context.svelte'
  import { colorClass, iconSizeClasses, textColorClasses } from '../../lib/colors'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import BooleanCell from './BooleanCell.svelte'
  import type { CellProps } from './cell-update.svelte'
  import ColorCell from './ColorCell.svelte'
  import ImageCell from './ImageCell.svelte'
  import SelectCell from './SelectCell.svelte'
  import TextCell from './TextCell.svelte'
  import TextInputCell from './TextInputCell.svelte'

  let props: CellProps = $props()

  const registry = useRegistry()
  // A component registered as `column:<type>` replaces the built-in cell renderer.
  const Custom = $derived(
    props.fromRegistry ? undefined : registry.resolve(columnRegistryKey(props.column)),
  )
  const t = useT()
  // `ViewColumn`: the application component registered under the column's `view()` name.
  const viewName = $derived((props.column as { component?: string }).component ?? '')
  const View = $derived(
    props.column.type === 'ViewColumn' && viewName ? registry.resolve(viewName) : undefined,
  )
</script>

{#if Custom}
  <Custom {...props} fromRegistry />
{:else if View}
  <View {...props.cell.props ?? {}} state={props.cell.state} {...props} />
{:else if props.column.type === 'ViewColumn'}
  <span class="text-destructive text-xs"
    >{t(
      'component_not_registered',
      { component: viewName },
      `Component ${viewName} is not registered.`,
    )}</span
  >
{:else if props.column.type === 'IconColumn'}
  {#if props.cell.icons}
    <!-- A list state: one icon per item (`wrap()` lets them wrap). -->
    <div
      data-slot="icon-column-icons"
      class={cn(
        'flex items-center gap-1.5',
        (props.column as IconColumnSchema).wrap ? 'flex-wrap' : 'flex-nowrap',
      )}
    >
      {#if props.cell.icons.length === 0}<span class="text-muted-foreground">—</span>{/if}
      {#each props.cell.icons as item, index (index)}
        <Icon
          name={item.icon}
          class={cn(
            colorClass(iconSizeClasses, props.cell.size, 'md'),
            item.color && textColorClasses[item.color],
          )}
        />
      {/each}
    </div>
  {:else if props.cell.icon}
    <Icon
      name={props.cell.icon}
      class={cn(
        colorClass(iconSizeClasses, props.cell.size, 'md'),
        props.cell.color && textColorClasses[props.cell.color],
      )}
    />
  {:else}
    <span class="text-muted-foreground">—</span>
  {/if}
{:else if props.column.type === 'ImageColumn'}
  <ImageCell {...props} />
{:else if props.column.type === 'ColorColumn'}
  <ColorCell {...props} />
{:else if props.column.type === 'ToggleColumn' || props.column.type === 'CheckboxColumn'}
  <BooleanCell {...props} />
{:else if props.column.type === 'SelectColumn'}
  <SelectCell {...props} />
{:else if props.column.type === 'TextInputColumn'}
  <TextInputCell {...props} />
{:else}
  <TextCell {...props} />
{/if}
