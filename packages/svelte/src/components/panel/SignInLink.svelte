<script lang="ts">
  import { Link } from '@inertiajs/svelte'
  import LogInIcon from '@lucide/svelte/icons/log-in'
  import { usePanel, useT } from '../../context.svelte'
  import { cn } from '../../lib/utils'

  /**
   * Shown instead of the user menu to guests (panels with `guestAccess()`) when the panel
   * has a login page.
   */
  let { variant = 'sidebar' }: { variant?: 'sidebar' | 'topbar' } = $props()

  const t = useT()
  const panel = $derived(usePanel())
  const loginUrl = $derived(panel.user ? undefined : panel.auth?.login)
</script>

{#if loginUrl}
  <Link
    href={loginUrl}
    data-slot="sign-in-link"
    class={cn(
      'focus-visible:ring-ring/50 flex items-center gap-2 rounded-md text-sm font-medium outline-none focus-visible:ring-[3px] [&_svg]:size-4 [&_svg]:shrink-0',
      variant === 'sidebar'
        ? 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full p-2'
        : 'hover:bg-accent hover:text-accent-foreground h-8 px-3',
    )}
  >
    <LogInIcon class="rtl:rotate-180" aria-hidden="true" />
    <span>{t('sign_in', {}, 'Sign in')}</span>
  </Link>
{/if}
