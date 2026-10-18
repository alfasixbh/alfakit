<script lang="ts">
  import PanelLeftIcon from '@lucide/svelte/icons/panel-left'
  import { cn } from '../../../lib/utils'
  import Icon from '../../../lib/Icon.svelte'
  import { Button } from '../button'
  import { useSidebar } from './context.svelte'
  import { useT } from '../../../context.svelte'

  let { class: className, onclick }: { class?: string; onclick?: (event: MouseEvent) => void } =
    $props()

  const sidebar = useSidebar()

  const t = useT()
</script>

<Button
  data-sidebar="trigger"
  data-slot="sidebar-trigger"
  variant="ghost"
  size="icon"
  class={cn('size-7', className)}
  onclick={(event: MouseEvent) => {
    onclick?.(event)
    sidebar.toggle()
  }}
>
  <Icon name="alfakit::panels.sidebar.toggle-button" fallback={PanelLeftIcon} />
  <span class="sr-only">{t('toggle_sidebar', {}, 'Toggle sidebar')}</span>
</Button>
