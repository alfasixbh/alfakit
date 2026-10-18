<script lang="ts">
  import type { NavigationGroupSchema, PageSchema } from '@alfakit/core'
  import NavGroup from '../src/components/panel/NavGroup.svelte'
  import Slot from '../src/components/panel/Slot.svelte'
  import { SidebarProvider } from '../src/components/ui/sidebar'
  import { provideAlfakit } from '../src/context.svelte'
  import AppLayout from '../src/layouts/AppLayout.svelte'
  import AuthLayout from '../src/layouts/AuthLayout.svelte'
  import PageShell from '../src/pages/PageShell.svelte'
  import { context } from './mocks'

  let {
    kind,
    page,
    group,
    name = '',
    scope,
  }: {
    kind: 'slot' | 'page' | 'app' | 'auth' | 'nav-group'
    page?: PageSchema
    group?: NavigationGroupSchema
    name?: string
    scope?: string
  } = $props()

  provideAlfakit(context)
</script>

{#if kind === 'slot'}
  <div data-testid="host"><Slot {name} {scope} /></div>
{:else if kind === 'page' && page}
  <PageShell {page}><p>Body</p></PageShell>
{:else if kind === 'app'}
  <AppLayout><p>Body</p></AppLayout>
{:else if kind === 'auth'}
  <AuthLayout heading="Sign in"><form>fields</form></AuthLayout>
{:else if kind === 'nav-group' && group}
  <SidebarProvider><NavGroup {group} /></SidebarProvider>
{/if}
