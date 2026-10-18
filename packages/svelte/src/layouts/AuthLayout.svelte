<script lang="ts">
  import type { Snippet } from 'svelte'
  import Brand from '../components/panel/Brand.svelte'
  import Slot from '../components/panel/Slot.svelte'
  import LocaleSwitcher from '../components/panel/LocaleSwitcher.svelte'
  import ThemeToggle from '../components/panel/ThemeToggle.svelte'
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
  import { usePanel } from '../context.svelte'
  import { cn } from '../lib/utils'
  import { MAX_WIDTHS } from './max-widths'

  let {
    heading,
    subheading,
    children,
  }: { heading?: string; subheading?: string; children?: Snippet } = $props()

  // `simplePageMaxContentWidth()` on the panel; `md` by default.
  const widthClass = $derived(
    MAX_WIDTHS[usePanel()?.simplePageMaxContentWidth ?? 'md'] ?? 'max-w-md',
  )
</script>

<!-- Centered card used by login, registration, password reset and simple profile pages. -->
<div class="bg-muted/40 flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
  <Slot name="simple.layout.start" />
  <div class="absolute end-4 top-4 flex items-center gap-1">
    <LocaleSwitcher />
    <ThemeToggle />
  </div>
  <div class={cn('flex w-full flex-col gap-6', widthClass)}>
    <div class="flex justify-center"><Brand /></div>
    <Slot name="auth.before" />
    <Card>
      <Slot name="simple.page.start" />
      {#if heading || subheading}
        <CardHeader class="text-center">
          {#if heading}<CardTitle role="heading" aria-level={1} class="text-xl">{heading}</CardTitle
            >{/if}
          {#if subheading}<CardDescription>{subheading}</CardDescription>{/if}
        </CardHeader>
      {/if}
      <CardContent>
        <!-- The server sends each form's slots on its own page only (Slot::pageTypes()). -->
        <Slot name="auth.login.form.before" />
        <Slot name="auth.register.form.before" />
        <Slot name="auth.password-reset.request.form.before" />
        <Slot name="auth.password-reset.reset.form.before" />
        {@render children?.()}
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
