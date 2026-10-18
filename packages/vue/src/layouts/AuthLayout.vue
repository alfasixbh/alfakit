<script setup lang="ts">
import type { PageSchema } from '@alfakit/core'
import Brand from '../components/panel/Brand.vue'
import LocaleSwitcher from '../components/panel/LocaleSwitcher.vue'
import Slot from '../components/panel/Slot.vue'
import ThemeToggle from '../components/panel/ThemeToggle.vue'
import Card from '../components/ui/Card.vue'
import CardContent from '../components/ui/CardContent.vue'
import CardDescription from '../components/ui/CardDescription.vue'
import CardHeader from '../components/ui/CardHeader.vue'
import CardTitle from '../components/ui/CardTitle.vue'
import { computed } from 'vue'
import { usePanel } from '../context'
import { cn } from '../lib/utils'
import { MAX_WIDTHS } from './max-widths'

/** Centered card used by login, registration, password reset and simple profile pages. */
const props = defineProps<{ heading?: string; subheading?: string; page?: PageSchema }>()
const panel = usePanel()
// `simplePageMaxContentWidth()` on the panel; `md` by default.
const widthClass = computed(
  () => MAX_WIDTHS[panel.value?.simplePageMaxContentWidth ?? 'md'] ?? 'max-w-md',
)
</script>

<template>
  <div class="bg-muted/40 flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
    <Slot name="simple.layout.start" />
    <div class="absolute end-4 top-4 flex items-center gap-1">
      <LocaleSwitcher />
      <ThemeToggle />
    </div>
    <div :class="cn('flex w-full flex-col gap-6', widthClass)">
      <div class="flex justify-center">
        <Brand />
      </div>
      <Slot name="auth.before" />
      <Card>
        <Slot name="simple.page.start" />
        <CardHeader v-if="props.heading || props.subheading" class="text-center">
          <CardTitle v-if="props.heading" role="heading" aria-level="1" class="text-xl">
            {{ props.heading }}
          </CardTitle>
          <CardDescription v-if="props.subheading">{{ props.subheading }}</CardDescription>
        </CardHeader>
        <CardContent>
          <!-- The server sends each form's slots on its own page only (Slot::pageTypes()). -->
          <Slot name="auth.login.form.before" />
          <Slot name="auth.register.form.before" />
          <Slot name="auth.password-reset.request.form.before" />
          <Slot name="auth.password-reset.reset.form.before" />
          <slot />
          <Slot name="auth.login.form.after" />
          <Slot name="auth.register.form.after" />
          <Slot name="auth.password-reset.request.form.after" />
          <Slot name="auth.password-reset.reset.form.after" />
        </CardContent>
        <Slot name="simple.page.end" />
      </Card>
      <Slot name="auth.after" />
      <Slot name="footer" />
    </div>
    <Slot name="simple.layout.end" />
  </div>
</template>
