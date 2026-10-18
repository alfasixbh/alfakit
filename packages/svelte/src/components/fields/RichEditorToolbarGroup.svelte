<script lang="ts">
  import type { RichEditorToolbarGroupSchema, ToolbarCommand } from '@alfakit/core'
  import { commandLabel, groupTriggerButton } from '@alfakit/core'
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down'
  import type { Editor } from '@tiptap/core'
  import type { Snippet } from 'svelte'
  import Icon from '../../lib/Icon.svelte'
  import { cn } from '../../lib/utils'
  import { Button } from '../ui/button'
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from '../ui/dropdown-menu'

  /** A `ToolbarButtonGroup`: a dropdown of buttons (icons, or labels with `textualButtons()`). */
  let {
    group,
    editor,
    editable,
    commands,
    icon,
    translate,
    onRun,
    tick = 0,
  }: {
    group: RichEditorToolbarGroupSchema
    editor: Editor
    editable: boolean
    commands: Record<string, ToolbarCommand>
    /** Renders a button's icon. */
    icon: Snippet<[string]>
    translate: (key: string, fallback: string) => string
    onRun: (name: string) => void
    /** Bumped on every editor transaction so active states follow the selection. */
    tick?: number
  } = $props()

  const buttons = $derived(group.buttons.filter((name) => commands[name]))
  const trigger = $derived.by(() => {
    void tick

    return groupTriggerButton(buttons, editor, commands)
  })
  const active = $derived.by(() => {
    void tick

    return buttons.some((name) => commands[name]?.active?.(editor))
  })
  const pressed = (name: string): boolean => {
    void tick

    return Boolean(commands[name]?.active?.(editor))
  }
</script>

{#if buttons.length > 0}
  <DropdownMenu>
    <DropdownMenuTrigger>
      {#snippet child({ props })}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={group.label}
          title={group.label}
          disabled={!editable}
          class={cn('h-8 gap-0.5 px-1.5', active && 'bg-accent text-accent-foreground')}
          onmousedown={(event: MouseEvent) => event.preventDefault()}
          {...props}
        >
          {#if group.icon}
            <Icon name={group.icon} />
          {:else if trigger}
            {@render icon(trigger)}
          {:else}
            {group.label}
          {/if}
          <ChevronDownIcon class="size-3 opacity-60" />
        </Button>
      {/snippet}
    </DropdownMenuTrigger>
    <DropdownMenuContent
      align="start"
      aria-label={group.label}
      class={cn(!group.textual && 'flex min-w-0 flex-row gap-0.5')}
    >
      {#each buttons as name (name)}
        {@const label = commandLabel(name, commands, translate)}
        <DropdownMenuItem
          aria-label={group.textual ? undefined : label}
          title={label}
          class={cn(pressed(name) && 'bg-accent text-accent-foreground')}
          onSelect={() => onRun(name)}
        >
          {@render icon(name)}
          {#if group.textual}<span>{label}</span>{/if}
        </DropdownMenuItem>
      {/each}
    </DropdownMenuContent>
  </DropdownMenu>
{/if}
