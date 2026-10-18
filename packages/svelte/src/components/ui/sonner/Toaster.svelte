<script lang="ts">
  import { onMount } from 'svelte'
  import { Toaster as Sonner, type ToasterProps } from 'svelte-sonner'
  import { useT } from '../../../context.svelte'

  let { toastOptions, ...rest }: ToasterProps = $props()

  const t = useT()

  // Follow the panel's class-based dark mode.
  let theme = $state<'light' | 'dark'>('light')

  onMount(() => {
    const sync = () => {
      theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    }

    sync()
    const observer = new MutationObserver(sync)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    return () => observer.disconnect()
  })
</script>

<!-- svelte-sonner appends the hotkey to the container label: "Notifications alt+T". -->
<Sonner
  {theme}
  class="toaster group"
  containerAriaLabel={t('notifications', {}, 'Notifications')}
  toastOptions={{
    closeButtonAriaLabel: t('close_notification', {}, 'Close notification'),
    ...toastOptions,
  }}
  style="--normal-bg: var(--popover); --normal-text: var(--popover-foreground); --normal-border: var(--border);"
  {...rest}
/>
