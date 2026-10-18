<script setup lang="ts">
import { Link } from '@inertiajs/vue3'
import { LogInIcon } from '@lucide/vue'
import { computed } from 'vue'
import { usePanel, useT } from '../../context'
import { cn } from '../../lib/utils'

/**
 * Shown instead of the user menu to guests (panels with `guestAccess()`) when the panel
 * has a login page.
 */
const props = withDefaults(defineProps<{ variant?: 'sidebar' | 'topbar' }>(), {
  variant: 'sidebar',
})
const t = useT()
const panel = usePanel()
const loginUrl = computed(() => (panel.value.user ? undefined : panel.value.auth?.login))
</script>

<template>
  <Link
    v-if="loginUrl"
    :href="loginUrl"
    data-slot="sign-in-link"
    :class="
      cn(
        'focus-visible:ring-ring/50 flex items-center gap-2 rounded-md text-sm font-medium outline-none focus-visible:ring-[3px] [&_svg]:size-4 [&_svg]:shrink-0',
        props.variant === 'sidebar'
          ? 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full p-2'
          : 'hover:bg-accent hover:text-accent-foreground h-8 px-3',
      )
    "
  >
    <LogInIcon class="rtl:rotate-180" aria-hidden="true" />
    <span>{{ t('sign_in', {}, 'Sign in') }}</span>
  </Link>
</template>
