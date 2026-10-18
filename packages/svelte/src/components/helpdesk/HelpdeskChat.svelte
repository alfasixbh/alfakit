<script lang="ts">
  import { HelpdeskChatClient, type HelpdeskChatOptions } from '@alfakit/core'
  import MessageCircleIcon from '@lucide/svelte/icons/message-circle'
  import XIcon from '@lucide/svelte/icons/x'
  import { onDestroy, onMount, untrack, type Component } from 'svelte'
  import { useStore } from '../../hooks/store.svelte'
  import { cn } from '../../lib/utils'

  /**
   * The helpdesk's live chat widget for your public pages (alfasix/alfakit-helpdesk): a
   * launcher button that opens the chat. The chat's code loads when it is first opened;
   * nothing renders on the server. Works outside panels (no `AlfakitRoot` needed).
   *
   * ```svelte
   * <HelpdeskChat endpoint="/support/chat" />
   * ```
   */
  let {
    endpoint,
    pollWhenClosed,
    request,
    position = 'end',
    defaultOpen = false,
    label,
    class: className,
  }: HelpdeskChatOptions & {
    /** Which corner, in the reading direction (`end` by default: bottom right in LTR). */
    position?: 'start' | 'end'
    defaultOpen?: boolean
    /** The launcher's accessible name before the server's texts arrive. */
    label?: string
    class?: string
  } = $props()

  type PanelProps = { client: HelpdeskChatClient; onclose: () => void }

  let Panel = $state<Component<PanelProps> | null>(null)
  let loading: Promise<void> | null = null
  const loadPanel = () =>
    (loading ??= import('./HelpdeskChatPanel.svelte').then((module) => {
      Panel = module.default as unknown as Component<PanelProps>
    }))

  const client = untrack(() => new HelpdeskChatClient({ endpoint, pollWhenClosed, request }))
  const chat = useStore(client.store)
  const id = $props.id()
  const panelId = `${id}-panel`
  let mounted = $state(false)
  let launcher = $state<HTMLButtonElement | null>(null)

  const ui = $derived(chat.current)
  const name = $derived(
    ui.open ? client.t('close', 'Close chat') : client.t('open', label ?? 'Open chat'),
  )
  const unread = $derived(
    typeof document === 'undefined'
      ? String(ui.unread)
      : new Intl.NumberFormat(document.documentElement.lang || undefined).format(ui.unread),
  )

  $effect(() => {
    if (ui.open) void loadPanel()
  })

  onMount(() => {
    mounted = true
    void client.load()

    if (untrack(() => defaultOpen)) client.setOpen(true)
  })

  onDestroy(() => client.stop())

  function close(): void {
    client.setOpen(false)
    launcher?.focus()
  }

  function toggle(): void {
    if (ui.open) close()
    else client.setOpen(true)
  }
</script>

{#if mounted && ui.config?.enabled !== false}
  <div
    data-slot="helpdesk-chat-widget"
    class={cn(
      'fixed bottom-4 z-50 flex flex-col gap-3',
      position === 'end' ? 'end-4 items-end' : 'start-4 items-start',
      className,
    )}
  >
    {#if ui.open && Panel}
      <div id={panelId}>
        <Panel {client} onclose={close} />
      </div>
    {/if}
    <button
      bind:this={launcher}
      type="button"
      aria-expanded={ui.open}
      aria-controls={ui.open ? panelId : undefined}
      aria-label={name}
      title={name}
      class="bg-primary text-primary-foreground focus-visible:ring-ring/50 relative flex size-14 items-center justify-center rounded-full shadow-lg transition-transform outline-none hover:scale-105 focus-visible:ring-[3px]"
      onclick={toggle}
      onmouseenter={() => void loadPanel()}
      onfocus={() => void loadPanel()}
    >
      {#if ui.open}
        <XIcon class="size-6" aria-hidden="true" />
      {:else}
        <MessageCircleIcon class="size-6 rtl:-scale-x-100" aria-hidden="true" />
      {/if}
      {#if !ui.open && ui.unread > 0}
        <span
          class="bg-destructive text-destructive-foreground absolute -end-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold"
        >
          {unread}
          <span class="sr-only"
            >{client.t('new_message', 'New message from :name', {
              name: client.t('agent', 'Support'),
            })}</span
          >
        </span>
      {/if}
    </button>
  </div>
{/if}
