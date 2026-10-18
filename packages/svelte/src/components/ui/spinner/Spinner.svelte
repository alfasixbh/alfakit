<script lang="ts">
  import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle'
  import type { LucideProps } from '@lucide/svelte'
  import Icon from '../../../lib/Icon.svelte'
  import { cn } from '../../../lib/utils'
  import { useT } from '../../../context.svelte'

  /**
   * The loading indicator. Its glyph is the `alfakit::support.loading-indicator` icon
   * alias, so an app replaces it everywhere with `Icons::register()` (or a `panel:icon`
   * component).
   */
  let { class: className, ...rest }: LucideProps = $props()

  const t = useT()
</script>

<span
  role="status"
  aria-label={t('loading', {}, 'Loading')}
  data-slot="spinner"
  class="inline-flex shrink-0"
>
  <Icon
    name="alfakit::support.loading-indicator"
    fallback={LoaderCircleIcon}
    aria-hidden="true"
    class={cn('size-4 animate-spin', className as string)}
    {...rest}
  />
</span>
