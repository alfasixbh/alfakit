<script lang="ts">
  import { cmsLinkRel, type CmsLinkSchema } from '@alfakit/core'
  import { Button, type ButtonSize, type ButtonVariant } from '../ui/button'
  import { useCms } from './context'

  /** A button link from a block (`primaryAction` / `secondaryAction`). */
  let {
    link,
    variant = 'default',
    size = 'lg',
    class: className,
  }: {
    link: CmsLinkSchema | null | undefined
    variant?: ButtonVariant
    size?: ButtonSize
    class?: string
  } = $props()

  const cms = useCms()
</script>

{#if link}
  <Button
    href={link.url}
    external
    {variant}
    {size}
    class={className}
    target={link.newTab ? '_blank' : undefined}
    rel={cmsLinkRel(link.newTab)}
    data-slot="cms-link-button"
  >
    {link.label}
    {#if link.newTab}<span class="sr-only">
        {cms.t('cms.new_tab', {}, '(opens in a new tab)')}</span
      >{/if}
  </Button>
{/if}
